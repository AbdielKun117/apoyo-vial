import { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { CheckCircle, Loader2, User, Phone, MessageSquare, RefreshCw, Clock, XCircle, Star } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { useStore } from '../store/useStore';
import { supabase } from '../lib/supabase';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix Leaflet icons
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// Custom Icons
const helperIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

const userIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

// Haversine formula
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function deg2rad(deg) {
    return deg * (Math.PI / 180);
}

function MapUpdater({ userLocation, helperLocation }) {
    const map = useMap();
    useEffect(() => {
        if (!map || !userLocation || !helperLocation) return;
        const bounds = L.latLngBounds([
            [userLocation.lat, userLocation.lng],
            [helperLocation.lat, helperLocation.lng]
        ]);
        map.fitBounds(bounds, { padding: [50, 50] });
    }, [map, userLocation, helperLocation]);
    return null;
}

export function RequestStatus() {
    const { currentRequest, setRequest } = useStore();
    const [status, setStatus] = useState(currentRequest.status || 'searching');
    const [helper, setHelper] = useState(null);
    const [helperLocation, setHelperLocation] = useState(null);
    const [requestLocation, setRequestLocation] = useState(null);
    const [eta, setEta] = useState(null);
    const [loading, setLoading] = useState(false);

    // UI States
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [cancelReason, setCancelReason] = useState('');
    const [showRatingModal, setShowRatingModal] = useState(false);
    const [rating, setRating] = useState(0);

    // 1. Broadcast User Location (Bidirectional Tracking)
    useEffect(() => {
        let watchId;
        let lastUpdate = 0;

        const startTracking = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            if (navigator.geolocation) {
                watchId = navigator.geolocation.watchPosition(
                    async (pos) => {
                        const { latitude, longitude } = pos.coords;
                        // Update local state for map
                        // Note: We might prefer using the DB location to be consistent, 
                        // but for the user's own marker, local is smoother.
                        // However, for the map to show what the helper sees, we might want to stick to DB or hybrid.
                        // Let's keep using the one fetched from DB for consistency in 'requestLocation' state,
                        // BUT we need to send this to DB.

                        const now = Date.now();
                        if (now - lastUpdate > 5000) {
                            lastUpdate = now;
                            await supabase
                                .from('profiles')
                                .update({
                                    current_lat: latitude,
                                    current_lng: longitude,
                                    updated_at: new Date().toISOString()
                                })
                                .eq('id', user.id);
                        }
                    },
                    (err) => console.error("Location error:", err),
                    { enableHighAccuracy: true }
                );
            }
        };

        if (status === 'searching' || status === 'found' || status === 'arrived') {
            startTracking();
        }

        return () => {
            if (watchId) navigator.geolocation.clearWatch(watchId);
        };
    }, [status]);

    // 2. Fetch Data
    const fetchLatestData = useCallback(async (isBackground = false) => {
        if (!currentRequest.id) return;

        try {
            if (!isBackground) setLoading(true);

            const { data: requestData, error: requestError } = await supabase
                .from('requests')
                .select('*')
                .eq('id', currentRequest.id)
                .single();

            if (requestError) throw requestError;

            if (requestData) {
                if (requestData.status !== status) {
                    setStatus(requestData.status);
                    if (requestData.status === 'completed') {
                        setShowRatingModal(true);
                    }
                }

                if (requestData.location_lat && requestData.location_lng) {
                    setRequestLocation({
                        lat: requestData.location_lat,
                        lng: requestData.location_lng
                    });
                }

                if (requestData.helper_id) {
                    const { data: helperData, error: helperError } = await supabase
                        .from('profiles')
                        .select('*')
                        .eq('id', requestData.helper_id)
                        .single();

                    if (!helperError) {
                        setHelper(helperData);
                        if (helperData.current_lat && helperData.current_lng) {
                            setHelperLocation({
                                lat: helperData.current_lat,
                                lng: helperData.current_lng
                            });
                        }
                    }
                }
            }
        } catch (error) {
            console.error("Error updating status:", error);
        } finally {
            if (!isBackground) setLoading(false);
        }
    }, [currentRequest.id, status]);

    useEffect(() => {
        fetchLatestData(false);
        const intervalId = setInterval(() => fetchLatestData(true), 5000);

        const requestSub = supabase
            .channel(`request:${currentRequest.id}`)
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'requests',
                filter: `id=eq.${currentRequest.id}`
            }, () => fetchLatestData(false))
            .subscribe();

        return () => {
            clearInterval(intervalId);
            supabase.removeChannel(requestSub);
        };
    }, [currentRequest.id, fetchLatestData]);

    // 3. ETA Calculation
    useEffect(() => {
        if (requestLocation && helperLocation) {
            const dist = calculateDistance(
                requestLocation.lat,
                requestLocation.lng,
                helperLocation.lat,
                helperLocation.lng
            );
            const speed = 30; // km/h
            const timeMinutes = Math.ceil((dist / speed) * 60) + 2;
            setEta(timeMinutes);
        }
    }, [requestLocation, helperLocation]);

    // 4. Actions
    const handleCancel = async () => {
        if (!cancelReason) return alert("Por favor selecciona una razón");

        try {
            const { error } = await supabase
                .from('requests')
                .update({
                    status: 'cancelled',
                    cancel_reason: cancelReason
                })
                .eq('id', currentRequest.id);

            if (error) throw error;

            setRequest({}); // Clear store
            window.location.href = '/role-selection'; // Redirect
        } catch (error) {
            alert("Error al cancelar: " + error.message);
        }
    };

    const handleRate = async () => {
        if (rating === 0) return alert("Por favor selecciona una calificación");

        try {
            const { error } = await supabase
                .from('requests')
                .update({ rating_user: rating })
                .eq('id', currentRequest.id);

            if (error) throw error;

            setRequest({}); // Clear store
            window.location.href = '/role-selection';
        } catch (error) {
            alert("Error al calificar: " + error.message);
        }
    };

    const handleCall = () => helper?.phone && (window.location.href = `tel:${helper.phone}`);
    const handleMessage = () => helper?.phone && window.open(`https://wa.me/${helper.phone.replace(/\D/g, '')}`, '_blank');

    // --- RENDER ---
    return (
        <div className="flex flex-col h-[calc(100vh-64px)] relative">
            {/* Map View */}
            <div className="h-1/2 w-full relative bg-gray-100">
                {requestLocation ? (
                    <MapContainer
                        center={[requestLocation.lat, requestLocation.lng]}
                        zoom={13}
                        style={{ height: '100%', width: '100%' }}
                    >
                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                        <Marker position={[requestLocation.lat, requestLocation.lng]} icon={userIcon}>
                            <Popup>Tu Ubicación</Popup>
                        </Marker>
                        {helperLocation && (
                            <Marker position={[helperLocation.lat, helperLocation.lng]} icon={helperIcon}>
                                <Popup>Ayudante</Popup>
                            </Marker>
                        )}
                        <MapUpdater userLocation={requestLocation} helperLocation={helperLocation} />
                    </MapContainer>
                ) : (
                    <div className="flex items-center justify-center h-full text-gray-400">
                        <Loader2 className="w-8 h-8 animate-spin mr-2" />
                        Cargando mapa...
                    </div>
                )}

                <div className="absolute top-4 right-4 z-[1000]">
                    <Button variant="secondary" size="sm" onClick={() => fetchLatestData(false)} disabled={loading}>
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </Button>
                </div>
            </div>

            {/* Status Panel */}
            <div className="flex-1 bg-white p-6 overflow-y-auto rounded-t-3xl shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] -mt-6 relative z-[1001]">
                {status === 'searching' && (
                    <div className="flex flex-col items-center justify-center h-full space-y-4">
                        <div className="relative">
                            <div className="absolute inset-0 bg-primary opacity-20 rounded-full animate-ping"></div>
                            <div className="bg-white p-4 rounded-full shadow-lg relative z-10">
                                <Loader2 className="w-12 h-12 text-primary animate-spin" />
                            </div>
                        </div>
                        <div className="text-center">
                            <h2 className="text-xl font-bold text-gray-800">Buscando ayuda...</h2>
                            <p className="text-gray-500 text-sm">Notificando a conductores cercanos</p>
                        </div>
                        <Button variant="outline" className="text-red-500 border-red-200 mt-8" onClick={() => setShowCancelModal(true)}>
                            Cancelar Solicitud
                        </Button>
                    </div>
                )}

                {(status === 'found' || status === 'arrived') && helper && (
                    <div className="space-y-6">
                        <div className="text-center border-b pb-4">
                            <div className="flex items-center justify-center space-x-2 text-green-600 mb-1">
                                <CheckCircle className="w-6 h-6" />
                                <span className="font-bold text-lg">¡Ayuda en camino!</span>
                            </div>
                            {eta !== null && (
                                <div className="inline-flex items-center bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm font-medium">
                                    <Clock className="w-4 h-4 mr-1" />
                                    Llegada en ~{eta} min
                                </div>
                            )}
                        </div>

                        <div className="flex items-center space-x-4">
                            <div className="bg-gray-100 p-4 rounded-full">
                                <User className="w-8 h-8 text-gray-600" />
                            </div>
                            <div>
                                <h3 className="font-bold text-xl text-gray-900">{helper.full_name}</h3>
                                <p className="text-gray-600">{helper.vehicle_model} • {helper.vehicle_color}</p>
                                <div className="flex items-center mt-1 space-x-2">
                                    <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded">
                                        {helper.vehicle_plates}
                                    </span>
                                    <span className="text-yellow-500 text-sm font-bold">★ 5.0</span>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 pt-2">
                            <Button className="bg-green-600 hover:bg-green-700" onClick={handleCall}>
                                <Phone className="w-4 h-4 mr-2" /> Llamar
                            </Button>
                            <Button variant="outline" onClick={handleMessage}>
                                <MessageSquare className="w-4 h-4 mr-2" /> WhatsApp
                            </Button>
                        </div>

                        <Button variant="ghost" className="w-full text-red-500 text-sm mt-4" onClick={() => setShowCancelModal(true)}>
                            Cancelar Servicio
                        </Button>
                    </div>
                )}

                {status === 'cancelled' && (
                    <div className="text-center py-10">
                        <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                        <h2 className="text-xl font-bold">Solicitud Cancelada</h2>
                        <Button className="mt-4" onClick={() => { setRequest({}); window.location.href = '/role-selection'; }}>
                            Volver al inicio
                        </Button>
                    </div>
                )}
            </div>

            {/* Cancel Modal */}
            {showCancelModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[2000] p-4">
                    <div className="bg-white rounded-lg p-6 w-full max-w-sm">
                        <h3 className="font-bold text-lg mb-4">Cancelar Solicitud</h3>
                        <p className="text-sm text-gray-600 mb-4">¿Por qué deseas cancelar?</p>
                        <select
                            className="w-full p-2 border rounded mb-4"
                            value={cancelReason}
                            onChange={(e) => setCancelReason(e.target.value)}
                        >
                            <option value="">Selecciona una razón</option>
                            <option value="Ya no necesito ayuda">Ya no necesito ayuda</option>
                            <option value="Tarda mucho tiempo">Tarda mucho tiempo</option>
                            <option value="Encontré otra solución">Encontré otra solución</option>
                            <option value="Otro">Otro</option>
                        </select>
                        <div className="flex space-x-2">
                            <Button variant="outline" className="flex-1" onClick={() => setShowCancelModal(false)}>Volver</Button>
                            <Button className="flex-1 bg-red-600 hover:bg-red-700" onClick={handleCancel}>Confirmar</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Rating Modal */}
            {showRatingModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[2000] p-4">
                    <div className="bg-white rounded-lg p-6 w-full max-w-sm text-center">
                        <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-2" />
                        <h3 className="font-bold text-lg mb-2">¡Servicio Completado!</h3>
                        <p className="text-gray-600 mb-4">¿Cómo estuvo tu ayudante?</p>

                        <div className="flex justify-center space-x-2 mb-6">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button key={star} onClick={() => setRating(star)}>
                                    <Star className={`w-8 h-8 ${rating >= star ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
                                </button>
                            ))}
                        </div>

                        <Button className="w-full" onClick={handleRate}>
                            Enviar Calificación
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}

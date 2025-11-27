import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { Battery, Navigation, AlertTriangle, CheckCircle, Clock, RefreshCw, Phone, MessageSquare, XCircle, Star } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { supabase } from '../lib/supabase';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

// Fix Leaflet icons
let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// Custom Icons
const redIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

const greenIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

// Component to auto-fit map bounds
function FitBounds({ requests, userLocation, selectedRequest, activeJob, victimLocation }) {
    const map = useMap();

    useEffect(() => {
        if (!map) return;

        const bounds = L.latLngBounds();
        let hasPoints = false;

        // Priority 1: Active Job (Show Helper + Victim)
        if (activeJob && userLocation && victimLocation) {
            bounds.extend([userLocation.lat, userLocation.lng]);
            bounds.extend([victimLocation.lat, victimLocation.lng]);
            hasPoints = true;
        }
        // Priority 2: Selected Request
        else if (selectedRequest && userLocation) {
            bounds.extend([userLocation.lat, userLocation.lng]);
            bounds.extend([selectedRequest.location_lat, selectedRequest.location_lng]);
            hasPoints = true;
        }
        // Priority 3: All Requests
        else {
            if (userLocation) {
                bounds.extend([userLocation.lat, userLocation.lng]);
                hasPoints = true;
            }
            requests.forEach(req => {
                bounds.extend([req.location_lat, req.location_lng]);
                hasPoints = true;
            });
        }

        if (hasPoints) {
            map.fitBounds(bounds, { padding: [50, 50] });
        }
    }, [map, requests, userLocation, selectedRequest, activeJob, victimLocation]);

    return null;
}

export function HelperDashboard() {
    const navigate = useNavigate();
    const [requests, setRequests] = useState([]);
    const [activeJob, setActiveJob] = useState(null);
    const [victimLocation, setVictimLocation] = useState(null);
    const [loading, setLoading] = useState(true);
    const [userLocation, setUserLocation] = useState(null);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [accepting, setAccepting] = useState(false);

    // UI States
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [cancelReason, setCancelReason] = useState('');
    const [cancelDescription, setCancelDescription] = useState('');
    const [showRatingModal, setShowRatingModal] = useState(false);
    const [rating, setRating] = useState(0);

    // 1. Get Helper Location & Track if Active Job exists
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
                        setUserLocation({ lat: latitude, lng: longitude });

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

        startTracking();

        return () => {
            if (watchId) navigator.geolocation.clearWatch(watchId);
        };
    }, []);

    // 2. Fetch Requests & Check for Active Job
    useEffect(() => {
        fetchRequests();
        const intervalId = setInterval(() => fetchRequests(true), 5000);

        const subscription = supabase
            .channel('public:requests')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'requests' }, () => {
                fetchRequests(true);
            })
            .subscribe();

        return () => {
            clearInterval(intervalId);
            supabase.removeChannel(subscription);
        };
    }, [fetchRequests]);

    // 3. Actions
    const handleAcceptRequest = async (request) => {
        setAccepting(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("No autenticado");

            const { error } = await supabase
                .from('requests')
                .update({
                    status: 'found',
                    helper_id: user.id
                })
                .eq('id', request.id);

            if (error) throw error;

            alert(`¡Has aceptado ayudar a ${request.profiles?.full_name}!`);
            fetchRequests(); // This should trigger activeJob detection
            setSelectedRequest(null);

        } catch (error) {
            alert("Error al aceptar: " + error.message);
        } finally {
            setAccepting(false);
        }
    };

    const handleCompleteJob = async () => {
        if (!activeJob) return;
        const confirm = window.confirm("¿Has terminado de ayudar?");
        if (!confirm) return;

        try {
            const { error } = await supabase
                .from('requests')
                .update({ status: 'completed' })
                .eq('id', activeJob.id);

            if (error) throw error;
            setShowRatingModal(true);
        } catch (error) {
            console.error("Error completing job:", error);
        }
    };

    const handleCancel = async () => {
        if (!cancelReason) return alert("Por favor selecciona una razón");
        if (cancelReason === 'Otro' && !cancelDescription.trim()) return alert("Por favor describe la razón");

        const finalReason = cancelReason === 'Otro' ? `Otro: ${cancelDescription}` : cancelReason;

        try {
            const { error } = await supabase
                .from('requests')
                .update({
                    status: 'cancelled',
                    cancel_reason: finalReason
                })
                .eq('id', activeJob.id);

            if (error) throw error;

            setShowCancelModal(false);
            fetchRequests();
        } catch (error) {
            alert("Error al cancelar: " + error.message);
        }
    };

    const handleRate = async () => {
        if (rating === 0) return alert("Por favor selecciona una calificación");

        try {
            const { error } = await supabase
                .from('requests')
                .update({ rating_helper: rating })
                .eq('id', activeJob.id);

            if (error) throw error;

            setShowRatingModal(false);
            fetchRequests();
        } catch (error) {
            alert("Error al calificar: " + error.message);
        }
    };

    const openGoogleMaps = () => {
        if (activeJob) {
            window.open(`https://www.google.com/maps/dir/?api=1&destination=${activeJob.location_lat},${activeJob.location_lng}&travelmode=driving`, '_blank');
        }
    };

    // --- RENDER ---

    // View 1: Active Job Mode
    if (activeJob) {
        return (
            <div className="flex flex-col h-[calc(100vh-64px)] relative">
                <div className="h-2/3 w-full relative">
                    <MapContainer center={[activeJob.location_lat, activeJob.location_lng]} zoom={13} style={{ height: '100%', width: '100%' }}>
                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                        <FitBounds requests={[]} userLocation={userLocation} activeJob={activeJob} victimLocation={victimLocation} />

                        {/* Helper */}
                        {userLocation && (
                            <Marker position={[userLocation.lat, userLocation.lng]} icon={redIcon}>
                                <Popup>Tú</Popup>
                            </Marker>
                        )}
                        {/* Victim (Live or Static) */}
                        {victimLocation ? (
                            <Marker position={[victimLocation.lat, victimLocation.lng]} icon={greenIcon}>
                                <Popup>Solicitante (En vivo)</Popup>
                            </Marker>
                        ) : (
                            <Marker position={[activeJob.location_lat, activeJob.location_lng]} icon={greenIcon}>
                                <Popup>Solicitante (Ubicación inicial)</Popup>
                            </Marker>
                        )}
                    </MapContainer>
                </div>

                <div className="flex-1 bg-white p-6 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-[1000] rounded-t-3xl -mt-6 overflow-y-auto">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h2 className="text-xl font-bold text-gray-800">Ayudando a {activeJob.profiles?.full_name}</h2>
                            <p className="text-gray-500">{activeJob.issue_type}</p>
                            {activeJob.description && (
                                <p className="text-sm text-gray-600 mt-1 italic">"{activeJob.description}"</p>
                            )}
                        </div>
                        <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-bold uppercase">
                            En Curso
                        </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-4">
                        <Button variant="outline" onClick={() => window.location.href = `tel:${activeJob.profiles?.phone}`}>
                            <Phone className="w-4 h-4 mr-2" /> Llamar
                        </Button>
                        <Button variant="outline" onClick={openGoogleMaps}>
                            <Navigation className="w-4 h-4 mr-2" /> Navegar
                        </Button>
                    </div>

                    <Button className="w-full bg-gray-900 hover:bg-gray-800 mb-3" onClick={handleCompleteJob}>
                        <CheckCircle className="w-4 h-4 mr-2" /> Finalizar Ayuda
                    </Button>

                    <Button variant="ghost" className="w-full text-red-500 text-sm" onClick={() => setShowCancelModal(true)}>
                        Cancelar Servicio
                    </Button>
                </div>

                {/* Cancel Modal */}
                {showCancelModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[2000] p-4">
                        <div className="bg-white rounded-lg p-6 w-full max-w-sm">
                            <h3 className="font-bold text-lg mb-4">Cancelar Servicio</h3>
                            <p className="text-sm text-gray-600 mb-4">¿Por qué deseas cancelar?</p>
                            <select
                                className="w-full p-2 border rounded mb-4"
                                value={cancelReason}
                                onChange={(e) => setCancelReason(e.target.value)}
                            >
                                <option value="">Selecciona una razón</option>
                                <option value="No encuentro la ubicación">No encuentro la ubicación</option>
                                <option value="Vehículo averiado">Vehículo averiado</option>
                                <option value="Zona peligrosa">Zona peligrosa</option>
                                <option value="Otro">Otro</option>
                            </select>

                            {cancelReason === 'Otro' && (
                                <textarea
                                    className="w-full p-2 border rounded mb-4"
                                    placeholder="Describe la razón..."
                                    value={cancelDescription}
                                    onChange={(e) => setCancelDescription(e.target.value)}
                                ></textarea>
                            )}

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
                            <h3 className="font-bold text-lg mb-2">¡Ayuda Finalizada!</h3>
                            <p className="text-gray-600 mb-4">Califica al solicitante</p>

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

    // View 2: Searching Mode (Default)
    return (
                                )
}
                            </div >
    <button onClick={() => setSelectedRequest(null)} className="text-gray-400 hover:text-gray-600">✕</button>
                        </div >
                        <div className="flex items-center text-sm text-gray-500 mb-4">
                            <Clock className="w-4 h-4 mr-1" />
                            <span>Tiempo estimado: Calculando...</span>
                        </div>
                        <Button
                            className="w-full bg-green-600 hover:bg-green-700"
                            onClick={() => handleAcceptRequest(selectedRequest)}
                            disabled={accepting}
                        >
                            {accepting ? 'Aceptando...' : 'Aceptar Ayuda'}
                        </Button>
                    </div >
                )}
            </div >

    <div className="flex-1 bg-white p-4 overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-gray-800">Solicitudes Activas ({requests.length})</h2>
        </div>

        {loading && requests.length === 0 ? (
            <p className="text-center text-gray-500">Cargando...</p>
        ) : requests.length === 0 ? (
            <p className="text-center text-gray-500">No hay solicitudes pendientes.</p>
        ) : (
            <div className="space-y-4">
                {requests.map((req) => (
                    <div
                        key={req.id}
                        className={`border rounded-lg p-4 shadow-sm flex justify-between items-center cursor-pointer transition-colors ${selectedRequest?.id === req.id ? 'border-primary bg-yellow-50' : 'border-gray-200 hover:bg-gray-50'}`}
                        onClick={() => setSelectedRequest(req)}
                    >
                        <div className="flex items-center space-x-4">
                            <div className="bg-yellow-100 p-3 rounded-full">
                                <AlertTriangle className="w-6 h-6 text-yellow-600" />
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-800">{req.issue_type}</h3>
                                <p className="text-sm text-gray-500">{req.profiles?.full_name}</p>
                            </div>
                        </div>
                        <div className="text-primary">
                            <Navigation className="w-5 h-5" />
                        </div>
                    </div>
                ))}
            </div>
        )}
    </div>
        </div >
    );
}

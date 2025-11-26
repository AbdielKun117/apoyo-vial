import { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { CheckCircle, Loader2, User, Phone, MessageSquare, RefreshCw, Clock } from 'lucide-react';
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

// Haversine formula to calculate distance in km
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; // Distance in km
    return d;
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
    const { currentRequest } = useStore();
    const [status, setStatus] = useState(currentRequest.status || 'searching');
    const [helper, setHelper] = useState(null);
    const [helperLocation, setHelperLocation] = useState(null);
    const [eta, setEta] = useState(null);
    const [loading, setLoading] = useState(false);

    // Function to fetch latest status and helper info
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
                }

                if (requestData.helper_id) {
                    const { data: helperData, error: helperError } = await supabase
                        .from('profiles')
                        .select('*')
                        .eq('id', requestData.helper_id)
                        .single();

                    if (helperError) {
                        console.error("Error fetching helper profile:", helperError);
                    } else {
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

    // Calculate ETA whenever locations change
    useEffect(() => {
        if (currentRequest.location && helperLocation) {
            const dist = calculateDistance(
                currentRequest.location.lat,
                currentRequest.location.lng,
                helperLocation.lat,
                helperLocation.lng
            );
            // Assume average speed of 30 km/h
            const speed = 30;
            const timeHours = dist / speed;
            const timeMinutes = Math.ceil(timeHours * 60);

            // Add a small buffer (e.g. 2 mins) for traffic/parking
            setEta(timeMinutes + 2);
        }
    }, [currentRequest.location, helperLocation]);

    useEffect(() => {
        fetchLatestData(false);

        const intervalId = setInterval(() => {
            fetchLatestData(true);
        }, 5000); // Poll every 5s for location updates

        // Subscribe to request changes
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

    const handleCall = () => {
        if (helper?.phone) {
            window.location.href = `tel:${helper.phone}`;
        }
    };

    const handleMessage = () => {
        if (helper?.phone) {
            const cleanPhone = helper.phone.replace(/\D/g, '');
            window.open(`https://wa.me/${cleanPhone}`, '_blank');
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-64px)] relative">
            {/* Map View */}
            <div className="h-1/2 w-full relative bg-gray-100">
                {currentRequest.location ? (
                    <MapContainer
                        center={[currentRequest.location.lat, currentRequest.location.lng]}
                        zoom={13}
                        style={{ height: '100%', width: '100%' }}
                    >
                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

                        {/* User Location */}
                        <Marker position={[currentRequest.location.lat, currentRequest.location.lng]} icon={userIcon}>
                            <Popup>Tu Ubicación</Popup>
                        </Marker>

                        {/* Helper Location */}
                        {helperLocation && (
                            <Marker position={[helperLocation.lat, helperLocation.lng]} icon={helperIcon}>
                                <Popup>Ayudante</Popup>
                            </Marker>
                        )}

                        <MapUpdater userLocation={currentRequest.location} helperLocation={helperLocation} />
                    </MapContainer>
                ) : (
                    <div className="flex items-center justify-center h-full text-gray-400">
                        Mapa no disponible
                    </div>
                )}

                {/* Refresh Button */}
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
                    </div>
                )}

                {status === 'found' && helper && (
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
                    </div>
                )}
            </div>
        </div>
    );
}

import { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { Battery, Navigation, AlertTriangle, CheckCircle, Clock, RefreshCw } from 'lucide-react';
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
function FitBounds({ requests, userLocation, selectedRequest }) {
    const map = useMap();

    useEffect(() => {
        if (!map) return;

        const bounds = L.latLngBounds();
        let hasPoints = false;

        // If a request is selected, focus on user + request
        if (selectedRequest && userLocation) {
            bounds.extend([userLocation.lat, userLocation.lng]);
            bounds.extend([selectedRequest.location_lat, selectedRequest.location_lng]);
            hasPoints = true;
        }
        // Otherwise show all requests + user
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
    }, [map, requests, userLocation, selectedRequest]);

    return null;
}

export function HelperDashboard() {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [userLocation, setUserLocation] = useState(null);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [accepting, setAccepting] = useState(false);

    // Get Helper Location
    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition((pos) => {
                setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
            });
        }
    }, []);

    // Fetch Requests
    const fetchRequests = useCallback(async (isBackground = false) => {
        if (!isBackground) setLoading(true);

        const { data, error } = await supabase
            .from('requests')
            .select(`*, profiles:user_id (full_name, phone)`)
            .eq('status', 'searching');

        if (error) console.error('Error fetching requests:', error);
        else setRequests(data || []);

        if (!isBackground) setLoading(false);
    }, []);

    useEffect(() => {
        fetchRequests();

        // Auto-refresh every 5 seconds
        const intervalId = setInterval(() => {
            fetchRequests(true);
        }, 5000);

        const subscription = supabase
            .channel('public:requests')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'requests' }, () => {
                console.log("Realtime update received");
                fetchRequests(true);
            })
            .subscribe();

        return () => {
            clearInterval(intervalId);
            supabase.removeChannel(subscription);
        };
    }, [fetchRequests]);

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

            alert(`¡Has aceptado ayudar a ${request.profiles?.full_name}! Dirígete a su ubicación.`);

            // Open navigation
            window.open(`https://www.google.com/maps/dir/?api=1&destination=${request.location_lat},${request.location_lng}`, '_blank');

            // Clear selection and refresh list
            setSelectedRequest(null);
            fetchRequests();

        } catch (error) {
            alert("Error al aceptar: " + error.message);
        } finally {
            setAccepting(false);
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-64px)] relative">
            <div className="h-1/2 w-full relative">
                <MapContainer center={[19.4326, -99.1332]} zoom={12} style={{ height: '100%', width: '100%' }}>
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

                    <FitBounds requests={requests} userLocation={userLocation} selectedRequest={selectedRequest} />

                    {/* Helper Location (Red) */}
                    {userLocation && (
                        <Marker position={[userLocation.lat, userLocation.lng]} icon={redIcon}>
                            <Popup>Tú (Ayudante)</Popup>
                        </Marker>
                    )}

                    {/* Requests (Green) */}
                    {requests.map(req => (
                        <Marker
                            key={req.id}
                            position={[req.location_lat, req.location_lng]}
                            icon={greenIcon}
                            eventHandlers={{
                                click: () => setSelectedRequest(req),
                            }}
                        >
                            <Popup>
                                <div className="text-center">
                                    <p className="font-bold">{req.issue_type}</p>
                                    <p>{req.profiles?.full_name}</p>
                                </div>
                            </Popup>
                        </Marker>
                    ))}
                </MapContainer>

                {/* Manual Refresh Button */}
                <div className="absolute top-4 right-4 z-[1000]">
                    <Button
                        variant="secondary"
                        size="sm"
                        className="bg-white shadow-md hover:bg-gray-100 text-gray-700"
                        onClick={() => fetchRequests(false)}
                        disabled={loading}
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </Button>
                </div>

                {selectedRequest && (
                    <div className="absolute bottom-4 left-4 right-4 bg-white p-4 rounded-lg shadow-xl z-[1000] border-l-4 border-primary animate-in slide-in-from-bottom">
                        <div className="flex justify-between items-start mb-2">
                            <div>
                                <h3 className="font-bold text-lg text-gray-800">{selectedRequest.issue_type}</h3>
                                <p className="text-gray-600">{selectedRequest.profiles?.full_name}</p>
                            </div>
                            <button onClick={() => setSelectedRequest(null)} className="text-gray-400 hover:text-gray-600">✕</button>
                        </div>
                        <div className="flex items-center text-sm text-gray-500 mb-4">
                            <Clock className="w-4 h-4 mr-1" />
                            <span>Tiempo estimado: 15 min</span>
                        </div>
                        <Button
                            className="w-full bg-green-600 hover:bg-green-700"
                            onClick={() => handleAcceptRequest(selectedRequest)}
                            disabled={accepting}
                        >
                            {accepting ? 'Aceptando...' : 'Aceptar Ayuda'}
                        </Button>
                    </div>
                )}
            </div>

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
        </div>
    );
}

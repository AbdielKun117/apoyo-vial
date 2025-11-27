import { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { Battery, Navigation, AlertTriangle, CheckCircle, Clock, RefreshCw, Phone, MessageSquare } from 'lucide-react';
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
function FitBounds({ requests, userLocation, selectedRequest, activeJob }) {
    const map = useMap();

    useEffect(() => {
        if (!map) return;

        const bounds = L.latLngBounds();
        let hasPoints = false;

        // Priority 1: Active Job
        if (activeJob && userLocation) {
            bounds.extend([userLocation.lat, userLocation.lng]);
            bounds.extend([activeJob.location_lat, activeJob.location_lng]);
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
    }, [map, requests, userLocation, selectedRequest, activeJob]);

    return null;
}

export function HelperDashboard() {
    const [requests, setRequests] = useState([]);
    const [activeJob, setActiveJob] = useState(null); // State for the accepted request
    const [loading, setLoading] = useState(true);
    const [userLocation, setUserLocation] = useState(null);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [accepting, setAccepting] = useState(false);

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

                        // Only broadcast to DB if we have an active job
                        // We check the 'activeJob' state ref or fetch it? 
                        // Better to rely on the functional update or a ref, but for simplicity:
                        // We will check Supabase directly or rely on the local state if it's reliable.
                        // Let's check Supabase to be sure we should be tracking.

                        const now = Date.now();
                        if (now - lastUpdate > 5000) { // Update every 5s
                            // Check if we really have an active job in DB to avoid stale state issues
                            const { data: activeRequests } = await supabase
                                .from('requests')
                                .select('id')
                                .eq('helper_id', user.id)
                                .in('status', ['found', 'arrived']);

                            if (activeRequests && activeRequests.length > 0) {
                                lastUpdate = now;
                                console.log("Broadcasting location...", latitude, longitude);
                                await supabase
                                    .from('profiles')
                                    .update({
                                        current_lat: latitude,
                                        current_lng: longitude,
                                        updated_at: new Date().toISOString()
                                    })
                                    .eq('id', user.id);
                            }
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
    const fetchRequests = useCallback(async (isBackground = false) => {
        if (!isBackground) setLoading(true);

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // First, check if I have an active job
        const { data: myJobs, error: jobError } = await supabase
            .from('requests')
            .select(`*, profiles:user_id (full_name, phone)`)
            .eq('helper_id', user.id)
            .in('status', ['found', 'arrived'])
            .single();

        if (myJobs) {
            setActiveJob(myJobs);
            setRequests([]); // Clear other requests
        } else {
            setActiveJob(null);
            // If no active job, fetch open requests
            const { data, error } = await supabase
                .from('requests')
                .select(`*, profiles:user_id (full_name, phone)`)
                .eq('status', 'searching');

            if (error) console.error('Error fetching requests:', error);
            else setRequests(data || []);
        }

        if (!isBackground) setLoading(false);
    }, []);

    useEffect(() => {
        fetchRequests();

        const intervalId = setInterval(() => {
            fetchRequests(true);
        }, 5000);

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

            // Force immediate fetch to switch view
            fetchRequests();
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
            fetchRequests();
        } catch (error) {
            console.error("Error completing job:", error);
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
                        <FitBounds requests={[]} userLocation={userLocation} activeJob={activeJob} />

                        {/* Helper */}
                        {userLocation && (
                            <Marker position={[userLocation.lat, userLocation.lng]} icon={redIcon}>
                                <Popup>Tú</Popup>
                            </Marker>
                        )}
                        {/* Victim */}
                        <Marker position={[activeJob.location_lat, activeJob.location_lng]} icon={greenIcon}>
                            <Popup>Solicitante: {activeJob.profiles?.full_name}</Popup>
                        </Marker>
                    </MapContainer>
                </div>

                <div className="flex-1 bg-white p-6 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-[1000] rounded-t-3xl -mt-6">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h2 className="text-xl font-bold text-gray-800">Ayudando a {activeJob.profiles?.full_name}</h2>
                            <p className="text-gray-500">{activeJob.issue_type}</p>
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

                    <Button className="w-full bg-gray-900 hover:bg-gray-800" onClick={handleCompleteJob}>
                        <CheckCircle className="w-4 h-4 mr-2" /> Finalizar Ayuda
                    </Button>
                </div>
            </div>
        );
    }

    // View 2: Searching Mode (Default)
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
                            <span>Tiempo estimado: Calculando...</span>
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

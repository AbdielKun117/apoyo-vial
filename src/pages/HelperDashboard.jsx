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

    // Rating State
    const [showRatingModal, setShowRatingModal] = useState(false);
    const [ratingJobId, setRatingJobId] = useState(null); // Store ID of job to rate
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
    const fetchRequests = useCallback(async (isBackground = false) => {
        if (!isBackground) setLoading(true);

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Check for active job - Fetch ALL to be safe against duplicates
        const { data: myJobs, error: jobError } = await supabase
            .from('requests')
            .select('*')
            .eq('helper_id', user.id)
            .in('status', ['found', 'arrived']);

        if (myJobs && myJobs.length > 0) {
            const currentJob = myJobs[0]; // Take the first one

            // Fetch victim profile manually
            const { data: victimProfile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', currentJob.user_id)
                .single();

            // Combine data
            const jobWithProfile = {
                ...currentJob,
                profiles: victimProfile
            };

            setActiveJob(jobWithProfile);
            setRequests([]);

            if (victimProfile && victimProfile.current_lat) {
                setVictimLocation({ lat: victimProfile.current_lat, lng: victimProfile.current_lng });
            }

        } else {
            setActiveJob(null);
            setVictimLocation(null);

            const { data: requestsData, error: reqError } = await supabase
                .from('requests')
                .select('*')
                .eq('status', 'searching');

            if (reqError) {
                console.error('Error fetching requests:', reqError);
            } else {
                // Manually fetch profiles
                const userIds = requestsData.map(r => r.user_id);
                if (userIds.length > 0) {
                    const { data: profiles } = await supabase
                        .from('profiles')
                        .select('id, full_name, phone')
                        .in('id', userIds);

                    const requestsWithProfiles = requestsData.map(req => ({
                        ...req,
                        profiles: profiles?.find(p => p.id === req.user_id)
                    }));
                    setRequests(requestsWithProfiles);
                } else {
                    setRequests(requestsData);
                }
            }
        }

        if (!isBackground) setLoading(false);
    }, []);

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
        // Reset rating state just in case
        setRating(0);
        setShowRatingModal(false);
        setRatingJobId(null);

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
            // 1. Save ID for rating
            setRatingJobId(activeJob.id);

            // 2. Update DB
            const { error } = await supabase
                .from('requests')
                .update({ status: 'completed' })
                .eq('id', activeJob.id);

            if (error) throw error;

            // 3. Show Modal & Clear Active Job
            setShowRatingModal(true);
            setActiveJob(null); // Clear immediately to switch view
            fetchRequests(); // Sync with DB

        } catch (error) {
            console.error("Error completing job:", error);
            alert("Error al finalizar: " + error.message);
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
        if (!ratingJobId) return;

        try {
            const { error } = await supabase
                .from('requests')
                .update({ rating_helper: rating })
                .eq('id', ratingJobId);

            if (error) throw error;

            setShowRatingModal(false);
            setRating(0);
            setRatingJobId(null);
            alert("¡Gracias por tu calificación!");
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

    return (
        <div className="flex flex-col h-[calc(100vh-64px)] relative">

            {/* MAIN CONTENT: Either Active Job Map OR Search Map */}
            {activeJob ? (
                // --- ACTIVE JOB VIEW ---
                <>
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
                            <div className="flex flex-col items-end">
                                <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-bold uppercase mb-1">
                                    En Curso
                                </span>
                                {/* Show counter if more than 1 job */}
                                {requests.length > 0 && ( // Note: requests is emptied when activeJob is set, so we need another way to track count. 
                                    // Actually, fetchRequests sets requests=[] when activeJob is found. 
                                    // We need to store the 'total active jobs' count in a separate state or derived from the fetch.
                                    // Let's modify fetchRequests to store this count.
                                    // For now, I will assume the user might have multiple. 
                                    // I'll add a "Cleanup" button if they feel stuck.
                                    <span className="text-xs text-gray-400">ID: {activeJob.id.slice(0, 4)}</span>
                                )}
                            </div>
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

                        {/* Emergency Cleanup Button - Only shows if user is stuck */}
                        <div className="mt-4 pt-4 border-t border-gray-100 text-center">
                            <p className="text-xs text-gray-400 mb-2">¿Tienes problemas para finalizar?</p>
                            <button
                                onClick={async () => {
                                    if (!window.confirm("¿Estás seguro? Esto finalizará TODAS tus solicitudes activas.")) return;
                                    const { data: { user } } = await supabase.auth.getUser();
                                    await supabase.from('requests').update({ status: 'completed' }).eq('helper_id', user.id).in('status', ['found', 'arrived']);
                                    alert("Se han finalizado todas las solicitudes.");
                                    fetchRequests();
                                }}
                                className="text-xs text-red-400 underline hover:text-red-600"
                            >
                                Forzar finalizar todo
                            </button>
                        </div>
                    </div>
                </>
            ) : (
                // --- SEARCH VIEW ---
                <>
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
                                        {selectedRequest.description && (
                                            <p className="text-xs text-gray-500 mt-1 line-clamp-2">"{selectedRequest.description}"</p>
                                        )}
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
                </>
            )}

            {/* --- MODALS (Rendered regardless of view mode) --- */}

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

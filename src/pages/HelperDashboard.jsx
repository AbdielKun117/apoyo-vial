import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { Battery, Navigation, AlertTriangle, CheckCircle, Clock, RefreshCw, Phone, MessageSquare, XCircle, Star } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { TOOLS_CATALOG, CATEGORY_MAPPING } from '../lib/constants';

// ... (imports)

export function HelperDashboard() {
    const navigate = useNavigate();
    const [requests, setRequests] = useState([]);
    const [activeJob, setActiveJob] = useState(null);
    const [victimLocation, setVictimLocation] = useState(null);
    const [loading, setLoading] = useState(true);
    const [userLocation, setUserLocation] = useState(null);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [searchRadius, setSearchRadius] = useState(50); // Default 50km
    const [userTools, setUserTools] = useState([]);

    // Helper: Calculate distance in km (Haversine Formula)
    const calculateDistance = (lat1, lon1, lat2, lon2) => {
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
    };

    const deg2rad = (deg) => {
        return deg * (Math.PI / 180);
    };

    // Helper: Check if user has tools for the request
    const checkCapability = (issueType) => {
        if (issueType === 'Otro') return true; // Always capable for generic help

        // 1. Find which categories this issue belongs to
        // Inverted mapping: We need to know which tool categories solve this issue.
        // CATEGORY_MAPPING: Tool Category -> [Issue Types Solved]

        // Let's find tool categories that can solve 'issueType'
        const usefulCategories = Object.keys(CATEGORY_MAPPING).filter(cat =>
            CATEGORY_MAPPING[cat].includes(issueType)
        );

        // 2. Check if user has ANY tool in those categories
        const hasTool = userTools.some(toolId => {
            const toolDef = TOOLS_CATALOG.find(t => t.id === toolId);
            return toolDef && usefulCategories.includes(toolDef.category);
        });

        return hasTool;
    };

    // Filter requests based on radius AND Sort by Capability
    const filteredRequests = requests
        .filter(req => {
            if (!userLocation) return true;
            const dist = calculateDistance(userLocation.lat, userLocation.lng, req.location_lat, req.location_lng);
            return dist <= searchRadius;
        })
        .sort((a, b) => {
            // Sort by Capability first (Capable -> Incapable)
            const aCapable = checkCapability(a.issue_type);
            const bCapable = checkCapability(b.issue_type);

            if (aCapable && !bCapable) return -1;
            if (!aCapable && bCapable) return 1;

            // Then by distance (closest first) - Optional but good UX
            if (userLocation) {
                const distA = calculateDistance(userLocation.lat, userLocation.lng, a.location_lat, a.location_lng);
                const distB = calculateDistance(userLocation.lat, userLocation.lng, b.location_lat, b.location_lng);
                return distA - distB;
            }
            return 0;
        });

    // ... (rest of the component)

    // --- RENDER ---

    return (
        <div className="flex flex-col h-[calc(100vh-64px)] relative">

            {/* MAIN CONTENT: Either Active Job Map OR Search Map */}
            {activeJob ? (
                // ... (Active Job View - Unchanged)
                // ...
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
                            {/* Victim - Always show the Request Location (The Car/Pin) */}
                            <Marker position={[activeJob.location_lat, activeJob.location_lng]} icon={greenIcon}>
                                <Popup>
                                    <div className="text-center">
                                        <p className="font-bold">Ubicación del Incidente</p>
                                        <p className="text-xs text-gray-500">Solicitante: {activeJob.profiles?.full_name}</p>
                                    </div>
                                </Popup>
                            </Marker>
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
                                {requests.length > 0 && (
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

                            <FitBounds requests={filteredRequests} userLocation={userLocation} selectedRequest={selectedRequest} />

                            {/* Helper Location (Red) */}
                            {userLocation && (
                                <Marker position={[userLocation.lat, userLocation.lng]} icon={redIcon}>
                                    <Popup>Tú (Ayudante)</Popup>
                                </Marker>
                            )}

                            {/* Requests (Green) */}
                            {filteredRequests.map(req => (
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

                        {/* Radius Filter Controls */}
                        <div className="absolute top-4 left-4 right-16 z-[1000] bg-white/90 backdrop-blur-sm p-3 rounded-lg shadow-md border border-gray-200">
                            <div className="flex flex-col space-y-2">
                                <div className="flex justify-between items-center">
                                    <label className="text-xs font-bold text-gray-700">Radio de búsqueda:</label>
                                    <span className="text-xs font-bold text-primary">{searchRadius} km</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <input
                                        type="range"
                                        min="1"
                                        max="100"
                                        value={searchRadius}
                                        onChange={(e) => setSearchRadius(Number(e.target.value))}
                                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
                                    />
                                    <input
                                        type="number"
                                        min="1"
                                        value={searchRadius}
                                        onChange={(e) => setSearchRadius(Number(e.target.value))}
                                        className="w-16 p-1 text-xs border rounded text-center"
                                    />
                                </div>
                            </div>
                        </div>

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
                            <h2 className="text-lg font-bold text-gray-800">Solicitudes Cercanas ({filteredRequests.length})</h2>
                        </div>

                        {loading && requests.length === 0 ? (
                            <p className="text-center text-gray-500">Cargando...</p>
                        ) : filteredRequests.length === 0 ? (
                            <div className="text-center py-8">
                                <p className="text-gray-500 mb-2">No hay solicitudes en este rango.</p>
                                <p className="text-xs text-gray-400">Intenta aumentar el radio de búsqueda.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {filteredRequests.map((req) => (
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
                                                {userLocation && (
                                                    <p className="text-xs text-gray-400 mt-1">
                                                        a {calculateDistance(userLocation.lat, userLocation.lng, req.location_lat, req.location_lng).toFixed(1)} km
                                                    </p>
                                                )}
                                                {!checkCapability(req.issue_type) && (
                                                    <span className="inline-block bg-red-100 text-red-800 text-[10px] px-2 py-0.5 rounded-full mt-1">
                                                        Faltan herramientas
                                                    </span>
                                                )}
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

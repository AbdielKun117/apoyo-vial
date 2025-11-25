import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Battery, Navigation, AlertTriangle } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { supabase } from '../lib/supabase';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

export function HelperDashboard() {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // 1. Fetch initial requests
        const fetchRequests = async () => {
            const { data, error } = await supabase
                .from('requests')
                .select(`
                    *,
                    profiles:user_id (full_name, phone)
                `)
                .eq('status', 'searching'); // Only show active requests

            if (error) console.error('Error fetching requests:', error);
            else setRequests(data || []);
            setLoading(false);
        };

        fetchRequests();

        // 2. Subscribe to realtime changes
        const subscription = supabase
            .channel('public:requests')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'requests' }, (payload) => {
                // When a new request comes in, fetch its details (including profile)
                // For simplicity, we just re-fetch all for now, or we could fetch just this one
                fetchRequests();
            })
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'requests' }, (payload) => {
                fetchRequests();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(subscription);
        };
    }, []);

    return (
        <div className="flex flex-col h-[calc(100vh-64px)]">
            <div className="h-1/2 w-full">
                <MapContainer center={[19.4326, -99.1332]} zoom={12} style={{ height: '100%', width: '100%' }}>
                    <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    {requests.map(req => (
                        <Marker key={req.id} position={[req.location_lat, req.location_lng]}>
                            <Popup>
                                <div className="text-center">
                                    <p className="font-bold">{req.issue_type}</p>
                                    <p>{req.profiles?.full_name || 'Usuario'}</p>
                                </div>
                            </Popup>
                        </Marker>
                    ))}
                </MapContainer>
            </div>

            <div className="flex-1 bg-white p-4 overflow-y-auto">
                <h2 className="text-lg font-bold text-gray-800 mb-4">Solicitudes Cercanas ({requests.length})</h2>

                {loading ? (
                    <p className="text-center text-gray-500">Cargando solicitudes...</p>
                ) : requests.length === 0 ? (
                    <p className="text-center text-gray-500">No hay solicitudes activas por ahora.</p>
                ) : (
                    <div className="space-y-4">
                        {requests.map((req) => (
                            <div key={req.id} className="border border-gray-200 rounded-lg p-4 shadow-sm flex justify-between items-center">
                                <div className="flex items-center space-x-4">
                                    <div className="bg-yellow-100 p-3 rounded-full">
                                        <AlertTriangle className="w-6 h-6 text-yellow-600" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-800">{req.issue_type}</h3>
                                        <p className="text-sm text-gray-500">
                                            {req.profiles?.full_name || 'Usuario'}
                                        </p>
                                    </div>
                                </div>
                                <Button
                                    size="sm"
                                    className="bg-green-600 hover:bg-green-700"
                                    onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${req.location_lat},${req.location_lng}`, '_blank')}
                                >
                                    <Navigation className="w-4 h-4 mr-1" /> Ir
                                </Button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

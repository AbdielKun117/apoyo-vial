import { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Battery, Navigation } from 'lucide-react';
import { Button } from '../components/ui/Button';
import 'leaflet/dist/leaflet.css';

// Fix for Leaflet marker icons
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
    const requests = [
        { id: 1, type: 'Batería', lat: 19.435, lng: -99.135, distance: '0.5 km', user: 'María G.' },
        { id: 2, type: 'Llanta', lat: 19.430, lng: -99.130, distance: '1.2 km', user: 'Pedro R.' },
    ];

    return (
        <div className="flex flex-col h-[calc(100vh-64px)]">
            <div className="h-1/2 w-full">
                <MapContainer center={[19.4326, -99.1332]} zoom={14} style={{ height: '100%', width: '100%' }}>
                    <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    {requests.map(req => (
                        <Marker key={req.id} position={[req.lat, req.lng]}>
                            <Popup>
                                <div className="text-center">
                                    <p className="font-bold">{req.type}</p>
                                    <p>{req.user}</p>
                                </div>
                            </Popup>
                        </Marker>
                    ))}
                </MapContainer>
            </div>

            <div className="flex-1 bg-white p-4 overflow-y-auto">
                <h2 className="text-lg font-bold text-gray-800 mb-4">Solicitudes Cercanas</h2>
                <div className="space-y-4">
                    {requests.map((req) => (
                        <div key={req.id} className="border border-gray-200 rounded-lg p-4 shadow-sm flex justify-between items-center">
                            <div className="flex items-center space-x-4">
                                <div className="bg-yellow-100 p-3 rounded-full">
                                    <Battery className="w-6 h-6 text-yellow-600" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-800">{req.type}</h3>
                                    <p className="text-sm text-gray-500">{req.distance} • {req.user}</p>
                                </div>
                            </div>
                            <Button
                                size="sm"
                                className="bg-green-600 hover:bg-green-700"
                                onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${req.lat},${req.lng}`, '_blank')}
                            >
                                <Navigation className="w-4 h-4 mr-1" /> Ir
                            </Button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

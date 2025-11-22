import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import { Button } from '../components/ui/Button';
import { useStore } from '../store/useStore';
import { Car, Battery, Fuel, Wrench, AlertTriangle, Zap, Disc, Activity, Crosshair } from 'lucide-react';
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

function LocationMarker({ position, setPosition }) {
    const map = useMapEvents({
        click(e) {
            setPosition(e.latlng);
        },
    });

    useEffect(() => {
        if (position) {
            map.flyTo(position, map.getZoom());
        }
    }, [position, map]);

    return position === null ? null : (
        <Marker position={position}></Marker>
    );
}

export function RequestHelp() {
    const navigate = useNavigate();
    const { setRequest } = useStore();
    const [position, setPosition] = useState({ lat: 19.4326, lng: -99.1332 });
    const [issueType, setIssueType] = useState(null);
    const [manualLocation, setManualLocation] = useState(false);

    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition((pos) => {
                const newPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                setPosition(newPos);
            }, (error) => {
                console.error("Error getting location:", error);
            });
        }
    }, []);

    const issues = [
        { id: 'mechanical', label: 'Mecánica', icon: Wrench, color: 'text-gray-700' },
        { id: 'fuel', label: 'Sin Gasolina', icon: Fuel, color: 'text-red-500' },
        { id: 'electrical', label: 'Eléctrico', icon: Zap, color: 'text-yellow-500' },
        { id: 'tire', label: 'Neumáticos', icon: Disc, color: 'text-gray-800' },
        { id: 'suspension', label: 'Suspensión', icon: Activity, color: 'text-blue-500' },
        { id: 'other', label: 'Otro', icon: AlertTriangle, color: 'text-orange-500' },
    ];

    const handleQuickHelp = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition((pos) => {
                const newPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                setPosition(newPos);
            });
        }
    };

    const handleRequest = () => {
        if (!position || !issueType) return;

        setRequest({
            location: position,
            issueType: issues.find(i => i.id === issueType),
            status: 'confirming'
        });

        navigate('/request-confirmation');
    };

    return (
        <div className="flex flex-col h-[calc(100vh-64px)]">
            <div className={`w-full relative z-0 transition-all duration-300 ${manualLocation ? 'h-2/3' : 'h-1/3'}`}>
                <MapContainer center={[19.4326, -99.1332]} zoom={13} scrollWheelZoom={true} style={{ height: '100%', width: '100%' }}>
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <LocationMarker position={position} setPosition={setPosition} />
                </MapContainer>

                <button
                    onClick={handleQuickHelp}
                    className="absolute bottom-4 right-4 bg-white p-3 rounded-full shadow-lg z-[1000] text-primary"
                >
                    <Crosshair className="w-6 h-6" />
                </button>

                <button
                    onClick={() => setManualLocation(!manualLocation)}
                    className="absolute top-4 right-4 bg-white px-3 py-1 rounded-md shadow-md z-[1000] text-xs font-bold text-gray-600"
                >
                    {manualLocation ? 'Ver Menú' : 'Expandir Mapa'}
                </button>
            </div>

            <div className="flex-1 bg-white p-6 rounded-t-3xl shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] -mt-6 relative z-10 overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-gray-800">¿Qué emergencia tienes?</h2>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-6">
                    {issues.map((issue) => {
                        const Icon = issue.icon;
                        const isSelected = issueType === issue.id;
                        return (
                            <button
                                key={issue.id}
                                onClick={() => setIssueType(issue.id)}
                                className={`flex flex-col items-center p-3 rounded-lg border-2 transition-all ${isSelected ? 'border-primary bg-yellow-50' : 'border-gray-100 hover:border-gray-200'
                                    }`}
                            >
                                <Icon className={`w-8 h-8 mb-2 ${issue.color}`} />
                                <span className="text-xs font-medium text-gray-700 text-center leading-tight">{issue.label}</span>
                            </button>
                        );
                    })}
                </div>

                <Button
                    className="w-full h-12 text-lg bg-red-600 hover:bg-red-700 text-white shadow-lg animate-pulse"
                    disabled={!issueType || !position}
                    onClick={handleRequest}
                >
                    SOLICITAR AUXILIO
                </Button>
            </div>
        </div>
    );
}

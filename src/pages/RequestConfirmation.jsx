import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { useStore } from '../store/useStore';
import { MapPin, AlertCircle, Car } from 'lucide-react';
import { supabase } from '../lib/supabase';

export function RequestConfirmation() {
    const navigate = useNavigate();
    const { user, vehicle, currentRequest, setRequest } = useStore();
    const [acceptedTerms, setAcceptedTerms] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleConfirm = async () => {
        if (!acceptedTerms) return;
        setLoading(true);

        try {
            const { data: { user: authUser } } = await supabase.auth.getUser();

            if (!authUser) {
                alert('Sesión expirada. Por favor inicia sesión de nuevo.');
                navigate('/');
                return;
            }

            // Update local store with the real ID from DB
            setRequest({
                id: data[0].id,
                status: 'searching'
            });

            navigate('/request-status');

        } catch (error) {
            console.error('Error sending request:', error);
            alert('Error al enviar solicitud: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    if (!currentRequest.issueType) {
        navigate('/request-help');
        return null;
    }

    return (
        <div className="flex flex-col items-center min-h-[80vh] p-4 space-y-6">
            <div className="text-center space-y-2">
                <h1 className="text-2xl font-bold text-secondary">Confirmar Solicitud</h1>
                <p className="text-gray-500">Revisa los detalles antes de enviar.</p>
            </div>

            <div className="w-full max-w-md bg-white rounded-xl shadow-md overflow-hidden">
                <div className="bg-red-50 p-4 border-b border-red-100 flex items-center space-x-3">
                    <AlertCircle className="text-red-500 w-6 h-6" />
                    <div>
                        <p className="text-xs text-red-500 font-bold uppercase">Emergencia</p>
                        <p className="font-bold text-gray-800">{currentRequest.issueType.label}</p>
                    </div>
                </div>

                <div className="p-6 space-y-6">
                    <div className="flex items-start space-x-3">
                        <MapPin className="text-gray-400 w-5 h-5 mt-1" />
                        <div>
                            <p className="text-sm text-gray-500">Ubicación</p>
                            <p className="font-medium text-gray-800">
                                Lat: {currentRequest.location.lat.toFixed(4)}, Lng: {currentRequest.location.lng.toFixed(4)}
                            </p>
                            <p className="text-xs text-gray-400">Ubicación aproximada en mapa</p>
                        </div>
                    </div>

                    <div className="flex items-start space-x-3">
                        <Car className="text-gray-400 w-5 h-5 mt-1" />
                        <div>
                            <p className="text-sm text-gray-500">Vehículo a Asistir</p>
                            <p className="font-medium text-gray-800">{vehicle.model} ({vehicle.color})</p>
                            <p className="text-sm text-gray-600">Placas: {vehicle.plates}</p>
                        </div>
                    </div>

                    <div className="border-t pt-4">
                        <label className="flex items-center space-x-3 cursor-pointer">
                            <input
                                type="checkbox"
                                className="w-5 h-5 text-primary rounded focus:ring-primary"
                                checked={acceptedTerms}
                                onChange={(e) => setAcceptedTerms(e.target.checked)}
                            />
                            <span className="text-sm text-gray-600">
                                Acepto compartir mi ubicación y datos con los ayudantes cercanos. Entiendo que la ayuda es voluntaria.
                            </span>
                        </label>
                    </div>
                </div>
            </div>

            <Button
                className="w-full max-w-md h-12 text-lg"
                disabled={!acceptedTerms || loading}
                onClick={handleConfirm}
            >
                {loading ? 'ENVIANDO...' : 'ENVIAR SOLICITUD'}
            </Button>

            <button
                onClick={() => navigate(-1)}
                className="text-gray-500 text-sm hover:underline"
            >
                Cancelar y volver
            </button>
        </div>
    );
}

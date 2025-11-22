import { useState, useEffect } from 'react';
import { CheckCircle, Loader2, User, Phone, MessageSquare } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { useStore } from '../store/useStore';

export function RequestStatus() {
    const { currentRequest, setRequest } = useStore();
    const [status, setStatus] = useState(currentRequest.status || 'searching');

    useEffect(() => {
        // Sync local status with store
        if (currentRequest.status) {
            setStatus(currentRequest.status);
        }

        // Simulate finding a helper if we are in searching mode
        if (status === 'searching') {
            const timer = setTimeout(() => {
                const newStatus = 'found';
                setStatus(newStatus);
                setRequest({ status: newStatus });
            }, 4000);
            return () => clearTimeout(timer);
        }
    }, [status, currentRequest.status, setRequest]);

    return (
        <div className="flex flex-col items-center justify-center min-h-[80vh] space-y-8 p-4">
            {status === 'searching' && (
                <>
                    <div className="relative">
                        <div className="absolute inset-0 bg-primary opacity-20 rounded-full animate-ping"></div>
                        <div className="bg-white p-6 rounded-full shadow-lg relative z-10">
                            <Loader2 className="w-16 h-16 text-primary animate-spin" />
                        </div>
                    </div>
                    <div className="text-center space-y-2">
                        <h2 className="text-2xl font-bold text-gray-800">Buscando ayuda cercana...</h2>
                        <p className="text-gray-500">Notificando a conductores con {currentRequest.issueType?.label || 'herramienta'}.</p>
                    </div>
                </>
            )}

            {status === 'found' && (
                <>
                    <div className="bg-green-100 p-6 rounded-full shadow-lg animate-bounce">
                        <CheckCircle className="w-16 h-16 text-green-600" />
                    </div>
                    <div className="text-center space-y-2">
                        <h2 className="text-2xl font-bold text-gray-800">¡Ayuda en camino!</h2>
                        <p className="text-gray-500">Un ángel vial ha aceptado tu solicitud.</p>
                    </div>

                    <div className="w-full max-w-sm bg-white p-6 rounded-xl shadow-md border border-gray-100">
                        <div className="flex items-center space-x-4">
                            <div className="bg-gray-200 p-3 rounded-full">
                                <User className="w-8 h-8 text-gray-600" />
                            </div>
                            <div>
                                <h3 className="font-bold text-lg">Roberto Méndez</h3>
                                <p className="text-sm text-gray-500">Jeep Wrangler Negro • Placas JEEP-999</p>
                                <div className="flex items-center mt-1">
                                    <span className="text-yellow-500 text-sm font-bold">★ 5.0</span>
                                    <span className="text-gray-400 text-xs ml-2">(42 ayudas)</span>
                                </div>
                            </div>
                        </div>

                        <div className="mt-4 p-3 bg-blue-50 rounded-lg text-sm text-blue-800">
                            <p><strong>Distancia:</strong> 2.5 km (aprox. 5 min)</p>
                        </div>

                        <div className="mt-6 flex space-x-3">
                            <Button className="flex-1 bg-green-600 hover:bg-green-700">
                                <Phone className="w-4 h-4 mr-2" /> Llamar
                            </Button>
                            <Button className="flex-1" variant="outline">
                                <MessageSquare className="w-4 h-4 mr-2" /> Mensaje
                            </Button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

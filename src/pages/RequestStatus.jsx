import { useState, useEffect } from 'react';
import { CheckCircle, Loader2, User, Phone, MessageSquare } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { useStore } from '../store/useStore';
import { supabase } from '../lib/supabase';

export function RequestStatus() {
    const { currentRequest, setRequest } = useStore();
    const [status, setStatus] = useState(currentRequest.status || 'searching');
    const [helper, setHelper] = useState(null);

    useEffect(() => {
        if (!currentRequest.id) return;

        // 1. Check initial status
        const checkStatus = async () => {
            const { data, error } = await supabase
                .from('requests')
                .select(`*, helper:helper_id (*)`)
                .eq('id', currentRequest.id)
                .single();

            if (data) {
                setStatus(data.status);
                if (data.helper) setHelper(data.helper);
            }
        };

        checkStatus();

        // 2. Subscribe to changes
        const subscription = supabase
            .channel(`request:${currentRequest.id}`)
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'requests',
                filter: `id=eq.${currentRequest.id}`
            }, async (payload) => {
                const newStatus = payload.new.status;
                setStatus(newStatus);

                // If found, fetch helper details
                if (newStatus === 'found' && payload.new.helper_id) {
                    const { data: helperData } = await supabase
                        .from('profiles')
                        .select('*')
                        .eq('id', payload.new.helper_id)
                        .single();

                    setHelper(helperData);
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(subscription);
        };
    }, [currentRequest.id]);

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
                        <p className="text-gray-500">Notificando a conductores cercanos...</p>
                        <p className="text-xs text-gray-400">Tu solicitud está visible para los ayudantes.</p>
                    </div>
                </>
            )}

            {status === 'found' && helper && (
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
                                <h3 className="font-bold text-lg">{helper.full_name}</h3>
                                <p className="text-sm text-gray-500">
                                    {helper.vehicle_model} • {helper.vehicle_color}
                                </p>
                                <p className="text-xs text-gray-400">Placas: {helper.vehicle_plates}</p>
                                <div className="flex items-center mt-1">
                                    <span className="text-yellow-500 text-sm font-bold">★ 5.0</span>
                                    <span className="text-gray-400 text-xs ml-2">(Nuevo)</span>
                                </div>
                            </div>
                        </div>

                        <div className="mt-4 p-3 bg-blue-50 rounded-lg text-sm text-blue-800">
                            <p><strong>Tiempo estimado:</strong> ~15 min</p>
                        </div>

                        <div className="mt-6 flex space-x-3">
                            <Button
                                className="flex-1 bg-green-600 hover:bg-green-700"
                                onClick={() => window.open(`tel:${helper.phone}`)}
                            >
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

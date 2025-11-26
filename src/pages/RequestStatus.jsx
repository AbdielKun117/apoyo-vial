import { useState, useEffect, useCallback } from 'react';
import { CheckCircle, Loader2, User, Phone, MessageSquare, RefreshCw } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { useStore } from '../store/useStore';
import { supabase } from '../lib/supabase';

export function RequestStatus() {
    const { currentRequest } = useStore();
    const [status, setStatus] = useState(currentRequest.status || 'searching');
    const [helper, setHelper] = useState(null);
    const [loading, setLoading] = useState(false);

    // Function to fetch latest status and helper info
    const fetchLatestData = useCallback(async () => {
        if (!currentRequest.id) return;

        try {
            setLoading(true);
            console.log("Fetching request data...");

            // 1. Get the request status first (No JOINs to avoid errors)
            const { data: requestData, error: requestError } = await supabase
                .from('requests')
                .select('*')
                .eq('id', currentRequest.id)
                .single();

            if (requestError) throw requestError;

            if (requestData) {
                console.log("Request status:", requestData.status);
                setStatus(requestData.status);

                // 2. If there is a helper, fetch their profile manually
                if (requestData.helper_id) {
                    console.log("Fetching helper:", requestData.helper_id);
                    const { data: helperData, error: helperError } = await supabase
                        .from('profiles')
                        .select('*')
                        .eq('id', requestData.helper_id)
                        .single();

                    if (helperError) {
                        console.error("Error fetching helper profile:", helperError);
                    } else {
                        setHelper(helperData);
                    }
                }
            }
        } catch (error) {
            console.error("Error updating status:", error);
        } finally {
            setLoading(false);
        }
    }, [currentRequest.id]);

    useEffect(() => {
        // Initial fetch
        fetchLatestData();

        // Subscribe to changes
        const subscription = supabase
            .channel(`request:${currentRequest.id}`)
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'requests',
                filter: `id=eq.${currentRequest.id}`
            }, (payload) => {
                console.log("Realtime update received!", payload);
                fetchLatestData();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(subscription);
        };
    }, [currentRequest.id, fetchLatestData]);

    const handleCall = () => {
        if (helper?.phone) {
            window.location.href = `tel:${helper.phone}`;
        }
    };

    const handleMessage = () => {
        if (helper?.phone) {
            const cleanPhone = helper.phone.replace(/\D/g, '');
            window.open(`https://wa.me/${cleanPhone}`, '_blank');
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-[80vh] space-y-8 p-4 relative">
            {/* Debug/Refresh Button */}
            <div className="absolute top-0 right-0 p-4">
                <Button variant="ghost" size="sm" onClick={fetchLatestData} disabled={loading}>
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </Button>
            </div>

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
                                onClick={handleCall}
                            >
                                <Phone className="w-4 h-4 mr-2" /> Llamar
                            </Button>
                            <Button
                                className="flex-1"
                                variant="outline"
                                onClick={handleMessage}
                            >
                                <MessageSquare className="w-4 h-4 mr-2" /> WhatsApp
                            </Button>
                        </div>
                    </div>
                </>
            )}

            {/* Fallback if status is found but helper data failed to load */}
            {status === 'found' && !helper && (
                <div className="text-center space-y-2">
                    <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto" />
                    <p className="text-gray-500">Cargando datos del ayudante...</p>
                    <Button variant="link" onClick={fetchLatestData}>Reintentar</Button>
                </div>
            )}
        </div>
    );
}

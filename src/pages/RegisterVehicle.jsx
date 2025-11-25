import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useStore } from '../store/useStore';
import { Car, Truck, Bike } from 'lucide-react';
import { supabase } from '../lib/supabase';

export function RegisterVehicle() {
    const navigate = useNavigate();
    const { setUser, setVehicle } = useStore();
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        model: '',
        color: '',
        plates: '',
        type: 'sedan'
    });

    // Check if user is logged in and fetch existing data
    useEffect(() => {
        const checkUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                navigate('/');
                return;
            }

            // Fetch existing profile
            const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();

            if (profile) {
                setFormData({
                    name: profile.full_name || '',
                    phone: profile.phone || '',
                    model: profile.vehicle_model || '',
                    color: profile.vehicle_color || '',
                    plates: profile.vehicle_plates || '',
                    type: profile.vehicle_type || 'sedan'
                });
            }
        };
        checkUser();
    }, [navigate]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) throw new Error('No usuario autenticado');

            const updates = {
                id: user.id,
                full_name: formData.name,
                phone: formData.phone,
                vehicle_model: formData.model,
                vehicle_color: formData.color,
                vehicle_plates: formData.plates,
                vehicle_type: formData.type,
                email: user.email,
                updated_at: new Date(),
            };

            const { error } = await supabase
                .from('profiles')
                .upsert(updates);

            if (error) throw error;

            // Save to local store as well for UI speed
            setUser({ name: formData.name, phone: formData.phone, email: user.email });
            setVehicle({
                model: formData.model,
                color: formData.color,
                plates: formData.plates,
                type: formData.type
            });

            navigate('/role-selection');
        } catch (error) {
            alert('Error guardando datos: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center min-h-[80vh] p-4 space-y-6">
            <div className="text-center space-y-2">
                <h1 className="text-2xl font-bold text-secondary">Registro de Datos</h1>
                <p className="text-gray-500">Para poder ayudarte, necesitamos saber quién eres y qué conduces.</p>
            </div>

            <form onSubmit={handleSubmit} className="w-full max-w-md space-y-4 bg-white p-6 rounded-lg shadow-md">
                <h3 className="font-bold text-gray-700 border-b pb-2">Tus Datos</h3>
                <Input
                    label="Nombre Completo"
                    name="name"
                    placeholder="Ej. Juan Pérez"
                    value={formData.name}
                    onChange={handleChange}
                    required
                />
                <Input
                    label="Teléfono"
                    name="phone"
                    type="tel"
                    placeholder="Ej. 55 1234 5678"
                    value={formData.phone}
                    onChange={handleChange}
                    required
                />

                <h3 className="font-bold text-gray-700 border-b pb-2 pt-4">Tu Vehículo</h3>

                <div className="flex justify-center space-x-4 mb-4">
                    {['sedan', 'suv', 'motorcycle'].map((type) => (
                        <button
                            key={type}
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, type }))}
                            className={`p-3 rounded-full border-2 transition-all ${formData.type === type ? 'border-primary bg-yellow-50 text-primary' : 'border-gray-200 text-gray-400'
                                }`}
                        >
                            {type === 'sedan' && <Car className="w-6 h-6" />}
                            {type === 'suv' && <Truck className="w-6 h-6" />}
                            {type === 'motorcycle' && <Bike className="w-6 h-6" />}
                        </button>
                    ))}
                </div>

                <Input
                    label="Modelo / Marca"
                    name="model"
                    placeholder="Ej. Nissan Versa 2020"
                    value={formData.model}
                    onChange={handleChange}
                    required
                />
                <div className="flex space-x-4">
                    <Input
                        label="Color"
                        name="color"
                        placeholder="Ej. Rojo"
                        value={formData.color}
                        onChange={handleChange}
                        required
                        className="flex-1"
                    />
                    <Input
                        label="Placas"
                        name="plates"
                        placeholder="ABC-123"
                        value={formData.plates}
                        onChange={handleChange}
                        required
                        className="flex-1"
                    />
                </div>

                <Button type="submit" className="w-full mt-6" disabled={loading}>
                    {loading ? 'Guardando...' : 'Guardar y Continuar'}
                </Button>
            </form>
        </div>
    );
}

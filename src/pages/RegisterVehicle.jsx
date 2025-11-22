import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useStore } from '../store/useStore';
import { Car, Truck, Bike } from 'lucide-react';

export function RegisterVehicle() {
    const navigate = useNavigate();
    const { setUser, setVehicle } = useStore();

    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        model: '',
        color: '',
        plates: '',
        type: 'sedan'
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        // Save to store
        setUser({ name: formData.name, phone: formData.phone });
        setVehicle({
            model: formData.model,
            color: formData.color,
            plates: formData.plates,
            type: formData.type
        });

        navigate('/role-selection');
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

                <Button type="submit" className="w-full mt-6">
                    Guardar y Continuar
                </Button>
            </form>
        </div>
    );
}

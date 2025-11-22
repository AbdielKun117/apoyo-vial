import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Battery, Wrench, Fuel, Triangle } from 'lucide-react';

export function HelperProfile() {
    const navigate = useNavigate();
    const [equipment, setEquipment] = useState({
        cables: false,
        jack: false,
        fuelCan: false,
        triangle: false,
    });

    const toggleEquipment = (key) => {
        setEquipment(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const handleSave = () => {
        // Save profile logic here
        navigate('/helper-dashboard');
    };

    return (
        <div className="flex flex-col items-center min-h-[80vh] p-4 space-y-6">
            <div className="text-center space-y-2">
                <h1 className="text-2xl font-bold text-secondary">Tu Perfil de Ayudante</h1>
                <p className="text-gray-500">¿Qué herramientas llevas contigo?</p>
            </div>

            <div className="w-full max-w-md grid grid-cols-2 gap-4">
                <button
                    onClick={() => toggleEquipment('cables')}
                    className={`p-4 rounded-xl border-2 flex flex-col items-center space-y-2 transition-all ${equipment.cables ? 'border-primary bg-yellow-50' : 'border-gray-200'
                        }`}
                >
                    <Battery className={`w-8 h-8 ${equipment.cables ? 'text-primary' : 'text-gray-400'}`} />
                    <span className="font-medium">Cables</span>
                </button>

                <button
                    onClick={() => toggleEquipment('jack')}
                    className={`p-4 rounded-xl border-2 flex flex-col items-center space-y-2 transition-all ${equipment.jack ? 'border-primary bg-yellow-50' : 'border-gray-200'
                        }`}
                >
                    <Wrench className={`w-8 h-8 ${equipment.jack ? 'text-primary' : 'text-gray-400'}`} />
                    <span className="font-medium">Gato Hidráulico</span>
                </button>

                <button
                    onClick={() => toggleEquipment('fuelCan')}
                    className={`p-4 rounded-xl border-2 flex flex-col items-center space-y-2 transition-all ${equipment.fuelCan ? 'border-primary bg-yellow-50' : 'border-gray-200'
                        }`}
                >
                    <Fuel className={`w-8 h-8 ${equipment.fuelCan ? 'text-primary' : 'text-gray-400'}`} />
                    <span className="font-medium">Bidón Gasolina</span>
                </button>

                <button
                    onClick={() => toggleEquipment('triangle')}
                    className={`p-4 rounded-xl border-2 flex flex-col items-center space-y-2 transition-all ${equipment.triangle ? 'border-primary bg-yellow-50' : 'border-gray-200'
                        }`}
                >
                    <Triangle className={`w-8 h-8 ${equipment.triangle ? 'text-primary' : 'text-gray-400'}`} />
                    <span className="font-medium">Señalamientos</span>
                </button>
            </div>

            <Button className="w-full max-w-md mt-8" onClick={handleSave}>
                Guardar y Continuar
            </Button>
        </div>
    );
}

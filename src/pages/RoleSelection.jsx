import { useNavigate } from 'react-router-dom';
import { Wrench, Car, UserCog } from 'lucide-react';
import { Button } from '../components/ui/Button';

export function RoleSelection() {
    const navigate = useNavigate();

    return (
        <div className="flex flex-col items-center justify-center min-h-[80vh] space-y-8 relative">

            <div className="absolute top-0 right-4">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate('/register-vehicle')}
                    className="flex items-center text-gray-600"
                >
                    <UserCog className="w-4 h-4 mr-2" /> Editar Perfil
                </Button>
            </div>

            <h1 className="text-2xl font-bold text-secondary text-center mt-8">¿Cómo quieres participar hoy?</h1>

            <div className="grid grid-cols-1 gap-6 w-full max-w-md px-4">
                <button
                    onClick={() => navigate('/request-help')}
                    className="flex flex-col items-center p-8 bg-white rounded-xl shadow-lg border-2 border-transparent hover:border-primary transition-all group"
                >
                    <div className="p-4 bg-red-100 rounded-full mb-4 group-hover:bg-red-200 transition-colors">
                        <Car className="w-12 h-12 text-red-500" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-800">Necesito Ayuda</h2>
                    <p className="text-center text-gray-500 mt-2">
                        Mi auto se averió y necesito asistencia en el camino.
                    </p>
                </button>

                <button
                    onClick={() => navigate('/helper-dashboard')}
                    className="flex flex-col items-center p-8 bg-white rounded-xl shadow-lg border-2 border-transparent hover:border-secondary transition-all group"
                >
                    <div className="p-4 bg-blue-100 rounded-full mb-4 group-hover:bg-blue-200 transition-colors">
                        <Wrench className="w-12 h-12 text-secondary" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-800">Quiero Ayudar</h2>
                    <p className="text-center text-gray-500 mt-2">
                        Tengo herramientas y puedo asistir a otros conductores.
                    </p>
                </button>
            </div>
        </div>
    );
}

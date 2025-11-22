import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

export function Login() {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleLogin = (e) => {
        e.preventDefault();
        // Mock login - navigate to vehicle registration first
        navigate('/register-vehicle');
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-[80vh] space-y-6">
            <div className="text-center space-y-2">
                <h1 className="text-3xl font-bold text-secondary">Bienvenido</h1>
                <p className="text-gray-500">Ingresa a Apoyo Vial</p>
            </div>

            <form onSubmit={handleLogin} className="w-full max-w-sm space-y-4 bg-white p-6 rounded-lg shadow-md">
                <Input
                    label="Correo Electrónico"
                    type="email"
                    placeholder="tu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                />
                <Input
                    label="Contraseña"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                />
                <Button type="submit" className="w-full">
                    Iniciar Sesión
                </Button>
            </form>

            <p className="text-sm text-gray-500">
                ¿No tienes cuenta? <span className="text-primary font-bold cursor-pointer">Regístrate</span>
            </p>
        </div>
    );
}

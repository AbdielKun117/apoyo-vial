import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { supabase } from '../lib/supabase';

export function Login() {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [isSignUp, setIsSignUp] = useState(false);
    const [error, setError] = useState(null);

    const handleAuth = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            if (isSignUp) {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                });
                if (error) throw error;
                alert('¡Registro exitoso! Revisa tu correo para confirmar (o inicia sesión si no activaste confirmación).');
            } else {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;
                navigate('/register-vehicle');
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-[80vh] space-y-6">
            <div className="text-center space-y-2">
                <h1 className="text-3xl font-bold text-secondary">
                    {isSignUp ? 'Crear Cuenta' : 'Bienvenido'}
                </h1>
                <p className="text-gray-500">
                    {isSignUp ? 'Regístrate en Apoyo Vial' : 'Ingresa a Apoyo Vial'}
                </p>
            </div>

            <form onSubmit={handleAuth} className="w-full max-w-sm space-y-4 bg-white p-6 rounded-lg shadow-md">
                {error && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
                        <span className="block sm:inline">{error}</span>
                    </div>
                )}

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
                    minLength={6}
                />
                <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? 'Cargando...' : (isSignUp ? 'Registrarse' : 'Iniciar Sesión')}
                </Button>
            </form>

            <p className="text-sm text-gray-500">
                {isSignUp ? '¿Ya tienes cuenta?' : '¿No tienes cuenta?'}
                <span
                    className="text-primary font-bold cursor-pointer ml-1"
                    onClick={() => setIsSignUp(!isSignUp)}
                >
                    {isSignUp ? 'Inicia Sesión' : 'Regístrate'}
                </span>
            </p>
        </div>
    );
}

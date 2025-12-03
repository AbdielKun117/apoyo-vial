import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { supabase } from '../lib/supabase';
import { useStore } from '../store/useStore';

export function Login() {
    const navigate = useNavigate();
    const { setUser, setVehicle } = useStore();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [isSignUp, setIsSignUp] = useState(false);
    const [error, setError] = useState(null);

    // Auto-redirect if already logged in
    useEffect(() => {
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                navigate('/role-selection', { replace: true });
            }
        };
        checkSession();
    }, [navigate]);

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
                const { data: { user }, error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;

                // Check if user has a profile
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', user.id)
                    .single();

                if (profile) {
                    // Load data into store
                    setUser({
                        name: profile.full_name,
                        phone: profile.phone,
                        email: user.email
                    });
                    setVehicle({
                        model: profile.vehicle_model,
                        color: profile.vehicle_color,
                        plates: profile.vehicle_plates,
                        type: profile.vehicle_type
                    });
                    navigate('/role-selection');
                } else {
                    navigate('/register-vehicle');
                }
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

            <div className="w-full max-w-sm">
                <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gray-300" />
                    </div>
                    <div className="relative flex justify-center text-sm">
                        <span className="px-2 bg-gray-50 text-gray-500">O continúa con</span>
                    </div>
                </div>

                <div className="mt-6 grid grid-cols-3 gap-3">
                    <button
                        type="button"
                        onClick={() => {
                            supabase.auth.signInWithOAuth({
                                provider: 'google',
                                options: { redirectTo: `${window.location.origin}/role-selection` }
                            });
                        }}
                        className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 transition-colors"
                    >
                        <svg className="h-5 w-5" aria-hidden="true" viewBox="0 0 24 24">
                            <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z" fill="currentColor" />
                        </svg>
                    </button>

                    <button
                        type="button"
                        onClick={() => {
                            supabase.auth.signInWithOAuth({
                                provider: 'facebook',
                                options: { redirectTo: `${window.location.origin}/role-selection` }
                            });
                        }}
                        className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 transition-colors"
                    >
                        <svg className="h-5 w-5" aria-hidden="true" fill="currentColor" viewBox="0 0 24 24">
                            <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" />
                        </svg>
                    </button>

                    <button
                        type="button"
                        onClick={() => {
                            supabase.auth.signInWithOAuth({
                                provider: 'apple',
                                options: { redirectTo: `${window.location.origin}/role-selection` }
                            });
                        }}
                        className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 transition-colors"
                    >
                        <svg className="h-5 w-5" aria-hidden="true" fill="currentColor" viewBox="0 0 24 24">
                            <path fillRule="evenodd" d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.666.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701z" clipRule="evenodd" />
                        </svg>
                    </button>
                </div>
            </div>

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

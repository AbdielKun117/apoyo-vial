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
            // If handling password recovery, do not auto-redirect
            if (window.location.hash && window.location.hash.includes('type=recovery')) {
                return;
            }

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
        <div className="flex flex-col items-center justify-center min-h-[80vh] space-y-3">
            <div className="text-center space-y-1">
                <img src="/logo.png" alt="Apoyo Vial" className="h-36 w-auto mx-auto mb-1" />
                <h1 className="text-3xl font-bold text-secondary dark:text-primary">
                    {isSignUp ? 'Crear Cuenta' : 'Bienvenido'}
                </h1>
                <p className="text-text-muted">
                    {isSignUp ? 'Regístrate en Apoyo Vial' : 'Ingresa a Apoyo Vial'}
                </p>
            </div>

            <form onSubmit={handleAuth} className="w-full max-w-sm space-y-3 bg-bg-card p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
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
                    className="bg-bg-main text-text-main border-gray-300 dark:border-gray-600"
                />
                <Input
                    label="Contraseña"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="bg-bg-main text-text-main border-gray-300 dark:border-gray-600"
                />

                {!isSignUp && (
                    <div className="text-right">
                        <button
                            type="button"
                            onClick={async () => {
                                if (!email) return alert("Ingresa tu correo primero.");
                                const { error } = await supabase.auth.resetPasswordForEmail(email, {
                                    redirectTo: `${window.location.origin}/reset-password`,
                                });
                                if (error) alert(error.message);
                                else alert("Revisa tu correo para restablecer la contraseña.");
                            }}
                            className="text-xs text-primary hover:underline"
                        >
                            ¿Olvidaste tu contraseña?
                        </button>
                    </div>
                )}

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
                        className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-bg-card text-sm font-medium text-text-muted hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
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
                        className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-bg-card text-sm font-medium text-text-muted hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                        <svg className="h-5 w-5" aria-hidden="true" fill="currentColor" viewBox="0 0 24 24">
                            <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" />
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

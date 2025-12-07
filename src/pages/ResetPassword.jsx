import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { supabase } from '../lib/supabase';

export function ResetPassword() {
    const navigate = useNavigate();
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    useEffect(() => {
        // Check if we are in a password recovery session
        supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === "PASSWORD_RECOVERY") {
                // User is here to reset password
            }
        });
    }, []);

    const handleReset = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');

        try {
            const { error } = await supabase.auth.updateUser({ password: password });

            if (error) throw error;

            alert("¡Contraseña actualizada con éxito!");
            navigate('/');
        } catch (error) {
            setMessage("Error: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
            <div className="w-full max-w-md bg-white p-8 rounded-lg shadow-md">
                <h2 className="text-2xl font-bold text-center text-secondary mb-6">Nueva Contraseña</h2>

                {message && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
                        <span className="block sm:inline">{message}</span>
                    </div>
                )}

                <form onSubmit={handleReset} className="space-y-4">
                    <Input
                        label="Nueva Contraseña"
                        type="password"
                        placeholder="Mínimo 6 caracteres"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />

                    <Button type="submit" className="w-full" disabled={loading}>
                        {loading ? 'Actualizando...' : 'Actualizar Contraseña'}
                    </Button>
                </form>
            </div>
        </div>
    );
}

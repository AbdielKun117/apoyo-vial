import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useStore } from '../../store/useStore';

export function AuthListener() {
    const navigate = useNavigate();
    const { setUser, setVehicle } = useStore();

    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log("Auth Event:", event);

            if (event === 'PASSWORD_RECOVERY') {
                navigate('/reset-password');
            } else if (event === 'SIGNED_OUT') {
                setUser({ name: '', phone: '', email: '' });
                setVehicle({ model: '', color: '', plates: '', type: 'sedan' });
                navigate('/');
            }
        });

        return () => subscription.unsubscribe();
    }, [navigate, setUser, setVehicle]);

    return null;
}

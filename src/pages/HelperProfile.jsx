import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Wrench } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { TOOLS_CATALOG } from '../lib/constants';

export function HelperProfile() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [tools, setTools] = useState([]);

    useEffect(() => {
        const fetchProfile = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                navigate('/');
                return;
            }

            const { data: profile } = await supabase
                .from('profiles')
                .select('tools')
                .eq('id', user.id)
                .single();

            if (profile) {
                setTools(profile.tools || []);
            }
            setLoading(false);
        };
        fetchProfile();
    }, [navigate]);

    const toggleTool = (toolId) => {
        setTools(prev =>
            prev.includes(toolId)
                ? prev.filter(t => t !== toolId)
                : [...prev, toolId]
        );
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("No usuario");

            const { error } = await supabase
                .from('profiles')
                .update({ tools: tools })
                .eq('id', user.id);

            if (error) throw error;

            navigate('/helper-dashboard');
        } catch (error) {
            alert("Error al guardar: " + error.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-8 text-center">Cargando perfil...</div>;

    return (
        <div className="flex flex-col items-center min-h-[80vh] p-4 space-y-6">
            <div className="text-center space-y-2">
                <h1 className="text-2xl font-bold text-secondary">Tu Perfil de Ayudante</h1>
                <p className="text-gray-500">Actualiza las herramientas que llevas contigo.</p>
            </div>

            <div className="w-full max-w-md grid grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto p-1">
                {TOOLS_CATALOG.map((tool) => (
                    <button
                        key={tool.id}
                        onClick={() => toggleTool(tool.id)}
                        className={`p-3 rounded-lg border-2 flex flex-col items-center justify-center space-y-2 transition-all ${tools.includes(tool.id)
                                ? 'border-primary bg-yellow-50 text-primary'
                                : 'border-gray-200 text-gray-400 hover:bg-gray-50'
                            }`}
                    >
                        <Wrench className={`w-6 h-6 ${tools.includes(tool.id) ? 'text-primary' : 'text-gray-400'}`} />
                        <span className="text-sm font-medium text-center leading-tight">{tool.name}</span>
                        <span className="text-[10px] text-gray-400 uppercase tracking-wider">{tool.category}</span>
                    </button>
                ))}
            </div>

            <Button className="w-full max-w-md mt-4" onClick={handleSave} disabled={saving}>
                {saving ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
        </div>
    );
}

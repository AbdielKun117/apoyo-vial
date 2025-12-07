import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { supabase } from '../lib/supabase';
import { MessageSquare, ArrowLeft } from 'lucide-react';

export function Suggestions() {
    const navigate = useNavigate();
    const [content, setContent] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!content.trim()) return;

        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("No autenticado");

            const { error } = await supabase
                .from('suggestions')
                .insert({
                    user_id: user.id,
                    content: content.trim()
                });

            if (error) throw error;

            alert("¡Gracias por tu sugerencia! La tomaremos en cuenta.");
            setContent('');
            navigate(-1); // Go back
        } catch (error) {
            alert("Error al enviar: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center min-h-[80vh] p-4 space-y-6">
            <div className="w-full max-w-md flex items-center mb-4">
                <button onClick={() => navigate(-1)} className="mr-4 text-gray-600">
                    <ArrowLeft className="w-6 h-6" />
                </button>
                <h1 className="text-2xl font-bold text-secondary">Sugerencias</h1>
            </div>

            <div className="text-center space-y-2 max-w-md">
                <MessageSquare className="w-12 h-12 text-primary mx-auto" />
                <p className="text-gray-500">¿Tienes ideas para mejorar la app? ¿Nuevas herramientas o categorías? ¡Cuéntanos!</p>
            </div>

            <form onSubmit={handleSubmit} className="w-full max-w-md space-y-4 bg-white p-6 rounded-lg shadow-md">
                <textarea
                    className="w-full p-3 border rounded-lg h-32 focus:ring-2 focus:ring-primary focus:border-transparent outline-none resize-none"
                    placeholder="Escribe tu sugerencia aquí..."
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    required
                ></textarea>

                <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? 'Enviando...' : 'Enviar Sugerencia'}
                </Button>
            </form>
        </div>
    );
}

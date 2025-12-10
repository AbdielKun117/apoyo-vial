import { Outlet } from 'react-router-dom';

export function Layout() {
    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <header className="bg-secondary text-white p-4 shadow-md sticky top-0 z-50">
                <div className="container mx-auto flex justify-between items-center">
                    <div className="flex items-center space-x-2 cursor-pointer" onClick={() => window.location.href = '/role-selection'}>
                        <img src="/logo.png" alt="Apoyo Vial Logo" className="h-10 w-auto" />
                        <h1 className="text-xl font-bold text-primary">Apoyo Vial</h1>
                    </div>
                    <div className="flex items-center space-x-4">
                        <button
                            onClick={() => window.location.href = '/suggestions'}
                            className="text-sm text-gray-300 hover:text-white transition-colors"
                        >
                            Sugerencias
                        </button>
                        <button
                            onClick={async () => {
                                await import('../../lib/supabase').then(m => m.supabase.auth.signOut());
                                window.location.href = '/';
                            }}
                            className="text-sm bg-red-500 hover:bg-red-600 px-3 py-1 rounded text-white font-bold transition-colors"
                        >
                            Salir
                        </button>
                    </div>
                </div>
            </header>

            <main className="flex-1 container mx-auto p-4">
                <Outlet />
            </main>

            {/* Bottom Navigation for mobile could go here */}
        </div>
    );
}

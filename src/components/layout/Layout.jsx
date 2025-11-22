import { Outlet } from 'react-router-dom';

export function Layout() {
    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <header className="bg-secondary text-white p-4 shadow-md sticky top-0 z-50">
                <div className="container mx-auto flex justify-between items-center">
                    <h1 className="text-xl font-bold text-primary">Apoyo Vial</h1>
                    {/* Navigation will go here */}
                </div>
            </header>

            <main className="flex-1 container mx-auto p-4">
                <Outlet />
            </main>

            {/* Bottom Navigation for mobile could go here */}
        </div>
    );
}

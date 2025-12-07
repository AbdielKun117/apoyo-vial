export const TOOLS_CATALOG = [
    // Mecánica
    { id: 'llaves', name: 'Juego de Llaves', category: 'Mecánica' },
    { id: 'desarmadores', name: 'Desarmadores', category: 'Mecánica' },
    { id: 'pinzas', name: 'Pinzas', category: 'Mecánica' },
    { id: 'gato', name: 'Gato Hidráulico', category: 'Mecánica' }, // Also useful for tires

    // Neumáticos
    { id: 'cruceta', name: 'Cruceta / Llave de Cruz', category: 'Neumáticos' },
    { id: 'gato_neumatico', name: 'Gato (para cambio de llanta)', category: 'Neumáticos' },
    { id: 'compresor', name: 'Compresor de Aire', category: 'Neumáticos' },
    { id: 'parches', name: 'Kit de Parches', category: 'Neumáticos' },

    // Eléctrico
    { id: 'cables', name: 'Cables Pasacorriente', category: 'Eléctrico' },
    { id: 'arrancador', name: 'Arrancador Portátil', category: 'Eléctrico' },
    { id: 'multimetro', name: 'Multímetro', category: 'Eléctrico' },
    { id: 'fusibles', name: 'Fusibles de Repuesto', category: 'Eléctrico' },

    // Suspensión (Often overlaps with mechanics but let's add specific if any, otherwise generic tools)
    { id: 'torres', name: 'Torres de Seguridad', category: 'Suspensión' },

    // Gasolina
    { id: 'bidon', name: 'Bidón para Gasolina', category: 'Sin Gasolina' },
    { id: 'embudo', name: 'Embudo', category: 'Sin Gasolina' },

    // Otros
    { id: 'extintor', name: 'Extintor', category: 'Seguridad' },
    { id: 'botiquin', name: 'Botiquín', category: 'Seguridad' },
    { id: 'linterna', name: 'Linterna', category: 'Seguridad' },
    { id: 'cuerda', name: 'Cuerda / Eslinga de Remolque', category: 'Remolque' },
];

export const CATEGORY_MAPPING = {
    'Mecánica': ['Mecánica', 'Suspensión'], // Tools in 'Mecánica' help with these issue types
    'Neumáticos': ['Neumáticos'],
    'Eléctrico': ['Eléctrico'],
    'Sin Gasolina': ['Sin Gasolina'],
    'Remolque': ['Mecánica', 'Suspensión', 'Otro'], // Towing helps with serious issues
    'Seguridad': ['Otro', 'Mecánica', 'Eléctrico', 'Neumáticos', 'Suspensión', 'Sin Gasolina'] // General safety
};

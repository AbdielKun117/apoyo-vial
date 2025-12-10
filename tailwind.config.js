/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class', // Enable class-based dark mode
    theme: {
        extend: {
            colors: {
                primary: 'var(--color-primary)',
                secondary: 'var(--color-secondary)',
                accent: 'var(--color-accent)',
                'bg-main': 'var(--color-bg-main)',
                'bg-card': 'var(--color-bg-card)',
                'text-main': 'var(--color-text-main)',
                'text-muted': 'var(--color-text-muted)',
            }
        },
    },
    plugins: [],
}

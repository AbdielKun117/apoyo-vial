/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: '#FFB703', // Safety Yellow/Orange
                secondary: '#023047', // Dark Blue
                accent: '#FB8500', // Orange
            }
        },
    },
    plugins: [],
}

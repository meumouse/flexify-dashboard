/** @type {import('tailwindcss').Config} */
export default {
    content: [
        './index.html',
        './src/**/*.{vue,js,ts,jsx,tsx}',
    ],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                primary: {
                    DEFAULT: '#212529',
                    foreground: '#ffffff',
                    hover: '#1b1f23',
                    active: '#16191d',
                    ring: '#212529',
                },
            },
        },
    },
    plugins: [],
}
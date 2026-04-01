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
                brand: {
                    50: 'rgb(var(--fd-accent-50) / <alpha-value>)',
                    100: 'rgb(var(--fd-accent-100) / <alpha-value>)',
                    200: 'rgb(var(--fd-accent-200) / <alpha-value>)',
                    300: 'rgb(var(--fd-accent-300) / <alpha-value>)',
                    400: 'rgb(var(--fd-accent-400) / <alpha-value>)',
                    500: 'rgb(var(--fd-accent-500) / <alpha-value>)',
                    600: 'rgb(var(--fd-accent-600) / <alpha-value>)',
                    700: 'rgb(var(--fd-accent-700) / <alpha-value>)',
                    800: 'rgb(var(--fd-accent-800) / <alpha-value>)',
                    900: 'rgb(var(--fd-accent-900) / <alpha-value>)',
                    950: 'rgb(var(--fd-accent-950) / <alpha-value>)',
                },
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

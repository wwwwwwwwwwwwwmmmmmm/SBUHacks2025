/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: 'class', // enable class-based dark mode so html.classList.add('dark') works
    content: [
        './src/**/*.{js,ts,jsx,tsx,tsx,mdx}',
        './app/**/*.{js,ts,jsx,tsx}',
    ],
    theme: {
        extend: {
            colors: {
                // Theme-aware colors that read from CSS variables (RGB components) so Tailwind
                // can support opacity shorthand (e.g. bg-primary/50) and generate utilities.
                background: 'rgb(var(--color-background) / <alpha-value>)',
                foreground: 'rgb(var(--color-foreground) / <alpha-value>)',
                muted: 'rgb(var(--color-muted) / <alpha-value>)',
                card: 'rgb(var(--color-card) / <alpha-value>)',
                'card-border': 'rgb(var(--color-card-border) / <alpha-value>)',

                primary: 'rgb(var(--color-primary) / <alpha-value>)',
                'primary-strong': 'rgb(var(--color-primary-strong) / <alpha-value>)',
                'on-primary': 'rgb(var(--color-on-primary) / <alpha-value>)',

                positive: 'rgb(var(--color-positive) / <alpha-value>)',
                negative: 'rgb(var(--color-negative) / <alpha-value>)',
                mark: 'rgb(var(--color-mark) / <alpha-value>)',

                'positive-border': 'rgb(var(--color-positive-border) / <alpha-value>)',
                'negative-border': 'rgb(var(--color-negative-border) / <alpha-value>)',
            },
        },
    },
    plugins: [],
};

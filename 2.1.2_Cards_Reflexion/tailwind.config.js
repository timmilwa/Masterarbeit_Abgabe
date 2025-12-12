/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#ffffff',
        foreground: 'oklch(0.145 0 0)',
        muted: '#f3f3f5',
        primary: '#030213',
        'primary-foreground': 'oklch(1 0 0)',
        secondary: 'oklch(0.95 0.0058 264.53)',
        accent: '#e9ebef',
        'accent-foreground': 'oklch(0.145 0 0)',
        destructive: '#d4183d',
        ring: 'oklch(0.623 .214 259.815)',
      },
      fontFamily: {
        sans: ['ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
}










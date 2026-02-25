/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
        tescha: {
          blue: '#003366',
          gold: '#FFB81C',
          gray: '#6B7280'
        }
      },
      // Breakpoints optimizados para la aplicación
      screens: {
        'xs': '475px',
        // sm: 640px (por defecto)
        // md: 768px (por defecto)
        // lg: 1024px (por defecto)
        // xl: 1280px (por defecto)
        '2xl': '1536px',
      },
      // Espaciado adicional para móviles
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '100': '25rem',
      }
    },
  },
  plugins: [],
}

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          500: '#FF671F', 
          600: '#E55A1B',
          700: '#CC4E17',
        },
        secondary: {
          50: '#ecfdf5',
          500: '#39A900', 
          600: '#2E8700',
          700: '#236600',
        },
        accent: {
          50: '#fff7ed',
          500: '#007BBF', 
          600: '#0066A3',
          700: '#005287',
        },
        sena: {
          orange: '#FF671F',
          green: '#39A900',
          blue: '#007BBF',
          gray: '#6B7280',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
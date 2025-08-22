/** @type {import('tailwindcss').Config} */
module.exports = {
  // ✅ AÑADE ESTA LÍNEA PARA HABILITAR EL MODO OSCURO
  darkMode: 'class',
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      keyframes: {
        'fill-up': {
          '0%': { clipPath: 'inset(100% 0 0 0)' },
          '100%': { clipPath: 'inset(0% 0 0 0)' },
        },
        'pulse-dot': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        }
      },
      animation: {
        'fill-up': 'fill-up 1.5s cubic-bezier(0.4, 0, 0.2, 1) infinite',
        'pulse-dot': 'pulse-dot 1.4s cubic-bezier(0.4, 0, 0.2, 1) infinite',
      }
    },
  },
  plugins: [],
};
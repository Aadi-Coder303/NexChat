/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: {
          DEFAULT: '#0A0A0B',
          lighter: '#121214',
          subtle: '#1C1C1F',
        },
        primary: {
          DEFAULT: '#6366F1', // Indigo 500
          hover: '#4F46E5',
          dark: '#4338CA',
        },
        accent: {
          DEFAULT: '#10B981', // Emerald 500
          soft: 'rgba(16, 185, 129, 0.1)',
        },
        danger: '#EF4444',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

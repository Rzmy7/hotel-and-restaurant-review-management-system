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
        brand: {
          DEFAULT: '#4E80EE',
          50: '#F9FAFB',
          100: '#F0F4FE',
          200: '#E1E9FD',
          300: '#C2D3FB',
          400: '#658CF3',
          500: '#4E80EE',
          600: '#3A66DE',
          700: '#2A4EBF',
          800: '#1D389F',
          900: '#14277F',
        },
        theme: {
          primary: '#4E80EE',
          surface: '#FEFEFE',
          bg: '#F9FAFB',
        }
      }
    },
  },
  plugins: [],
}

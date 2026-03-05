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
          DEFAULT: '#4e80ee',
          50: '#f0f4fe',
          100: '#e1e9fd',
          200: '#c2d3fb',
          300: '#a4bdf9',
          400: '#658cf3',
          500: '#4e80ee',
          600: '#3a66de',
          700: '#2a4ebf',
          800: '#1d389f',
          900: '#14277f',
        }
      }
    },
  },
  plugins: [],
}

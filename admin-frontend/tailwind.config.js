import plugin from 'tailwindcss/plugin';

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [
    plugin(function ({ addBase }) {
      addBase({
        /* ── Dark‑mode base styles for elements that can't carry utility classes ── */

        /* Color‑scheme so native controls follow the theme */
        'html.dark': {
          colorScheme: 'dark',
        },

        /* Tables */
        '.dark th': {
          color: '#94a3b8',          /* slate‑400 */
          borderColor: '#334155',    /* slate‑700 */
        },
        '.dark td': {
          borderColor: '#1e293b',    /* slate‑800 */
        },
        '.dark thead': {
          backgroundColor: '#0f172a', /* slate‑900 */
        },
        '.dark tbody tr:hover': {
          backgroundColor: '#1e293b', /* slate‑800 */
        },

        /* Form controls — global fallback for inputs/selects/textareas */
        '.dark input:not([type="checkbox"]):not([type="radio"]):not(.sr-only)': {
          backgroundColor: '#1e293b',
          color: '#e2e8f0',
          borderColor: '#475569',
        },
        '.dark select': {
          backgroundColor: '#1e293b',
          color: '#e2e8f0',
          borderColor: '#475569',
        },
        '.dark textarea': {
          backgroundColor: '#1e293b',
          color: '#e2e8f0',
          borderColor: '#475569',
        },
        '.dark input::placeholder, .dark textarea::placeholder': {
          color: '#64748b',          /* slate‑500 */
        },


      });
    }),
  ],
}

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'anime-indigo': '#6366f1',
        'anime-pink': '#ec4899',
        'manga-red': '#ef4444',
        'manga-blue': '#3b82f6',
        'manga-yellow': '#facc15',
        'manga-green': '#10b981',
        'paper-white': '#f8f5f0',
        'ink-black': '#0f0f0f',
      },
      fontFamily: {
        'comic': ['Comic Neue', 'system-ui', 'sans-serif'],
        'manga': ['Bangers', 'cursive'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'wiggle': 'wiggle 1s ease-in-out infinite',
        'float': 'float 3s ease-in-out infinite',
      },
      keyframes: {
        wiggle: {
          '0%, 100%': { transform: 'rotate(-3deg)' },
          '50%': { transform: 'rotate(3deg)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'speed-lines': 'repeating-linear-gradient(-45deg, transparent, transparent 1px, rgba(0,0,0,0.1) 1px, rgba(0,0,0,0.1) 2px)',
        'manga-dots': 'radial-gradient(#000 1px, transparent 2px)',
        'manga-grid': 'linear-gradient(to right, #e5e5e5 1px, transparent 1px), linear-gradient(to bottom, #e5e5e5 1px, transparent 1px)',
      },
      boxShadow: {
        'manga': '2px 2px 0 rgba(0, 0, 0, 0.1)',
        'manga-lg': '4px 4px 0 rgba(0, 0, 0, 0.2)',
        'inner-page': 'inset 0 0 20px rgba(0, 0, 0, 0.1)',
      },
      borderWidth: {
        '3': '3px',
      },
    },
  },
  plugins: [],
} 
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'system-ui', 'sans-serif'],
      },
      colors: {
        ff: {
          bg: '#f4f6f9',
          surface: '#ffffff',
          border: '#eef0f4',
          'border-hover': '#bfdbfe',
          blue: '#1d4ed8',
          'blue-light': '#eff6ff',
          navy: '#0f172a',
          slate: '#475569',
          muted: '#94a3b8',
          dark: '#0f172a',
          'dark-surface': '#1e293b',
          'dark-border': '#334155',
        },
      },
      height: { 13: '52px' },
      width: { 52: '208px', 14: '56px' },
    },
  },
  plugins: [],
}
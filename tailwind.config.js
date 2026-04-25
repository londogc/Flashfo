/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx}','./components/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: { sans: ['-apple-system','BlinkMacSystemFont','"Segoe UI"','system-ui','sans-serif'] },
      colors: {
        bg:      'var(--c-bg)',
        surface: 'var(--c-surface)',
        surface2:'var(--c-surface2)',
        line:    'var(--c-line)',
        t1:      'var(--c-t1)',
        t2:      'var(--c-t2)',
        t3:      'var(--c-t3)',
      },
    },
  },
  plugins: [],
}
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: 'var(--c-bg)',
        paper: 'var(--c-paper)',
        ink: 'var(--c-ink)',
        muted: 'var(--c-muted)',
        line: 'var(--c-line)',
        accent: {
          DEFAULT: 'var(--c-accent)',
          soft: 'var(--c-accent-soft)',
          hover: 'var(--c-accent-hover)',
        },
        'on-accent': 'var(--c-on-accent)',
      },
      fontFamily: {
        sans: ['Manrope', 'system-ui', 'sans-serif'],
        serif: ['Fraunces', 'Georgia', 'serif'],
      },
      boxShadow: {
        lift: 'var(--c-shadow)',
      },
    },
  },
  plugins: [],
}

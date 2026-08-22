/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        pathwise: {
          ink: 'var(--pw-ink)',
          muted: 'var(--pw-muted)',
          surface: 'var(--pw-surface)',
          accent: 'var(--pw-accent)',
          accentStrong: 'var(--pw-accent-strong)',
          accentSoft: 'var(--pw-accent-soft)',
          bg: 'var(--pw-bg)',
        },
      },
    },
  },
  plugins: [],
}

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'Inter',
          'system-ui',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
      },
      boxShadow: {
        pathwise: 'var(--pw-shadow)',
      },
      borderRadius: {
        card: 'var(--pw-radius-card)',
      },
      colors: {
        pathwise: {
          page: 'var(--background)',
          line: 'var(--pw-border)',
          ink: 'var(--pw-ink)',
          muted: 'var(--pw-muted)',
          surface: 'var(--pw-surface)',
          accent: 'var(--pw-accent)',
          accentStrong: 'var(--pw-accent-strong)',
          accentSoft: 'var(--pw-accent-soft)',
          /** legacy aliases — map to same tokens as sutaniese */
          bg: 'var(--background)',
        },
        foreground: 'var(--foreground)',
        background: 'var(--background)',
        primary: {
          DEFAULT: 'var(--pw-primary)',
          strong: 'var(--pw-primary-strong, var(--pw-primary))',
        },
      },
      ringColor: {
        'pathwise-line': 'var(--pw-border)',
      },
    },
  },
  plugins: [],
}

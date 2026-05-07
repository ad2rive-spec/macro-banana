import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        purple: {
          DEFAULT: 'var(--color-purple)',
          dark: 'var(--color-purple-dark)',
          300: '#c4b5fd',
        },
      },
      textColor: {
        text: 'var(--color-text)',
        muted: 'var(--color-muted)',
        faint: 'var(--color-faint)',
      },
      backgroundColor: {
        base: 'var(--color-base)',
        surface: 'var(--color-surface)',
        panel: 'var(--color-panel)',
        raised: 'var(--color-raised)',
        hover: 'var(--color-hover)',
      },
    },
  },
  plugins: [],
}

export default config

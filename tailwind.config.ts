import type { Config } from 'tailwindcss'

export default {
  content: ['./src/**/*.{ts,tsx}', './app/**/*.{ts,tsx}'],
  // light-only (darkMode omitted)
  theme: {
    extend: {
      colors: {
        primary: '#2563eb',
        secondary: '#0ea5e9'
      },
      container: {
        center: true,
        padding: '1rem'
      }
    }
  },
  plugins: [require('@tailwindcss/forms')]
} satisfies Config

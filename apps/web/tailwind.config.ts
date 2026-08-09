import type { Config } from 'tailwindcss';

// Deliberately restrained: a professional case-management tool, not a colourful SaaS dashboard.
// Neutral slate surfaces, one accent for actions/links, semantic colours reserved for status only.
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        accent: {
          50: '#eff6ff',
          100: '#dbeafe',
          500: '#2563eb',
          600: '#1d4ed8',
          700: '#1e40af',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config;

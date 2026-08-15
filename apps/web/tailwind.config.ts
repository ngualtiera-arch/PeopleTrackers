import type { Config } from 'tailwindcss';

// Deliberately restrained: a professional case-management tool, not a colourful SaaS dashboard.
// Neutral slate surfaces, one accent for actions/links, semantic colours reserved for status only.
// Teal + navy chosen from a reference (iTrace Software) Nicole pointed to — "600" carries the
// exact brand teal (#0f766e) since that's the shade nearly every button/link in the app already
// references via this one token.
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        accent: {
          50: '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          500: '#14b8a6',
          600: '#0f766e',
          700: '#115e59',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config;

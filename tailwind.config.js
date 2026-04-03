/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './content/**/*.{md,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'Menlo', 'monospace'],
        quote: ['Playfair Display', 'Georgia', 'serif'],
      },
      colors: {
        // Magazine/Blog color system from ui-ux-pro-max
        brand: {
          primary: '#18181B',
          secondary: '#3F3F46',
          accent: '#EC4899',
          bg: '#FAFAFA',
          fg: '#09090B',
          card: '#FFFFFF',
          cardFg: '#09090B',
          muted: '#E8ECF0',
          mutedFg: '#64748B',
          border: '#E4E4E7',
        },
      },
      typography: {
        DEFAULT: {
          css: {
            maxWidth: 'none',
            color: '#09090B',
            'h1,h2,h3,h4': {
              fontFamily: 'Inter, sans-serif',
              fontWeight: '700',
              letterSpacing: '-0.025em',
            },
            code: {
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '0.875em',
            },
            'code::before': { content: '""' },
            'code::after': { content: '""' },
          },
        },
      },
    },
  },
  plugins: [],
}

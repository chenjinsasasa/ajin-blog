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
        // Bold Typography Mobile stack (ui-ux-pro-max typography.csv #1)
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Inter', 'sans-serif'],        // Inter 600–800 for all UI & headings
        mono: ['JetBrains Mono', 'Menlo', 'monospace'], // JetBrains Mono for code/labels
        quote: ['Playfair Display', 'Georgia', 'serif'], // Playfair Display Italic for pull quotes
      },
      colors: {
        // Magazine/Blog color system (ui-ux-pro-max colors.csv — Product Type: Magazine/Blog)
        brand: {
          primary:    '#18181B',
          secondary:  '#3F3F46',
          accent:     '#EC4899',
          accentDark: '#F472B6',
          bg:         '#FAFAFA',
          fg:         '#09090B',
          card:       '#FFFFFF',
          cardFg:     '#09090B',
          muted:      '#F4F4F5',
          mutedFg:    '#71717A',
          border:     '#E4E4E7',
          destructive: '#DC2626',
        },
      },
      letterSpacing: {
        tighter: '-0.04em',
        tight:   '-0.025em',
      },
      maxWidth: {
        prose: '68ch',
        content: '680px', // Minimal & Direct spec
      },
      animation: {
        'fade-up': 'fade-up 0.4s ease both',
      },
      keyframes: {
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}

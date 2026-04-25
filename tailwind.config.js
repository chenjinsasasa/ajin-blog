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
        sans: ['var(--font-body)', 'sans-serif'],
        display: ['var(--font-display)', 'serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      colors: {
        brand: {
          bg: 'var(--bg)',
          fg: 'var(--fg)',
          card: 'var(--card)',
          muted: 'var(--muted)',
          border: 'var(--border)',
          accent: 'var(--accent)',
        },
      },
      animation: {
        'fade-up': 'fade-up 0.45s ease both',
      },
      keyframes: {
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(14px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      maxWidth: {
        content: '1100px',
      },
    },
  },
  plugins: [],
}

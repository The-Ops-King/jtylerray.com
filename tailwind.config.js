/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: '#000000',
        'bg-elevated': '#0a0a0a',
        fg: '#f5f5f5',
        'fg-muted': '#a3a3a3',
        border: '#262626',
        accent: '#d4af37', // Gold
        'accent-dark': '#b8941f',
        danger: '#dc2626',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      fontSize: {
        'h1': ['3rem', { lineHeight: '1.1', fontWeight: '800' }],    // 48px
        'h1-lg': ['4rem', { lineHeight: '1.1', fontWeight: '800' }], // 64px
        'h2': ['2.25rem', { lineHeight: '1.2', fontWeight: '700' }], // 36px
        'h2-lg': ['2.75rem', { lineHeight: '1.2', fontWeight: '700' }], // 44px
        'h3': ['1.75rem', { lineHeight: '1.2', fontWeight: '700' }], // 28px
        'h3-lg': ['2rem', { lineHeight: '1.2', fontWeight: '700' }],  // 32px
        'h4': ['1.25rem', { lineHeight: '1.3', fontWeight: '600' }], // 20px
        'h4-lg': ['1.5rem', { lineHeight: '1.3', fontWeight: '600' }], // 24px
        'body': ['1rem', { lineHeight: '1.6', fontWeight: '400' }],   // 16px
        'body-lg': ['1.125rem', { lineHeight: '1.6', fontWeight: '400' }], // 18px
        'small': ['0.8125rem', { lineHeight: '1.5', fontWeight: '400' }], // 13px
      },
      spacing: {
        '4': '0.25rem',   // 4px
        '8': '0.5rem',    // 8px
        '12': '0.75rem',  // 12px
        '16': '1rem',     // 16px
        '20': '1.25rem',  // 20px
        '24': '1.5rem',   // 24px
        '28': '1.75rem',  // 28px
        '32': '2rem',     // 32px
        '40': '2.5rem',   // 40px
        '48': '3rem',     // 48px
        '64': '4rem',     // 64px
        '80': '5rem',     // 80px
        '96': '6rem',     // 96px
        '128': '8rem',    // 128px
      },
      borderRadius: {
        'card': '0.75rem', // 12px
        'card-lg': '1rem', // 16px
      },
      maxWidth: {
        'container': '75rem', // 1200px
        'container-lg': '80rem', // 1280px
      },
    },
  },
  plugins: [],
}

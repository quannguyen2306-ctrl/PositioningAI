/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        base: '#0d0d10',
        surface: '#161619',
        raised: '#1e1e23',
        subtle: '#2a2a32',
        accent: '#7c5cfc',
        'accent-glow': 'rgba(124, 92, 252, 0.15)',
        'text-primary': '#f0f0f4',
        'text-secondary': '#6e6e80',
        'text-muted': '#3a3a46',
        'score-high': '#22c55e',
        'score-mid': '#f59e0b',
        'score-low': '#ef4444',
        'border-hover': '#3a3a46',
      },
      fontFamily: {
        display: ['Syne', 'sans-serif'],
        mono: ['"DM Mono"', 'monospace'],
        body: ['"DM Sans"', 'sans-serif'],
      },
      fontSize: {
        '2xs': ['10px', '1.4'],
        'xs': ['11px', '1.4'],
        'sm': ['12px', '1.5'],
        'base': ['13px', '1.5'],
        'md': ['14px', '1.5'],
        'lg': ['16px', '1.4'],
        'xl': ['18px', '1.3'],
        '2xl': ['22px', '1.3'],
        '3xl': ['32px', '1.2'],
        '4xl': ['40px', '1.1'],
        '5xl': ['48px', '1.1'],
        '6xl': ['56px', '1'],
      },
      borderRadius: {
        DEFAULT: '8px',
        'sm': '6px',
        'md': '10px',
        'lg': '12px',
        'xl': '14px',
        '2xl': '16px',
        'full': '9999px',
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.5)',
        'accent-glow': '0 4px 16px rgba(124,92,252,0.35)',
        'focus-ring': '0 0 0 3px rgba(124,92,252,0.12)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.97)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'pulse-glow': {
          '0%, 100%': { filter: 'drop-shadow(0 0 4px rgba(251,191,36,0.6))' },
          '50%': { filter: 'drop-shadow(0 0 12px rgba(251,191,36,0.9))' },
        },
        'sweep': {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(400%)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.3s ease-out forwards',
        'fade-up-1': 'fade-up 0.3s ease-out 0ms forwards',
        'fade-up-2': 'fade-up 0.3s ease-out 80ms forwards',
        'fade-up-3': 'fade-up 0.3s ease-out 160ms forwards',
        'fade-up-4': 'fade-up 0.3s ease-out 240ms forwards',
        'fade-in': 'fade-in 0.12s ease-out forwards',
        'scale-in': 'scale-in 0.25s ease-in forwards',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'sweep': 'sweep 1.5s linear infinite',
      },
      transitionProperty: {
        DEFAULT: 'all',
      },
      transitionDuration: {
        DEFAULT: '150ms',
      },
      transitionTimingFunction: {
        DEFAULT: 'ease',
      },
    },
  },
  plugins: [],
}

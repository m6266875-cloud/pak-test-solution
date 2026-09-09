/** @type {import('tailwindcss').Config} */
/*
 * PakTest Solution — "Zinc Green Premium" design tokens.
 *
 * brand   → deep zinc green (primary actions, active states, sidebar)
 * surface → warm zinc/grey neutrals on a warm off-white base (#FAF9F6)
 * beige   → warm beige (#F5F0E8) for section fills, zebra striping, chips
 * brass   → muted gold accent, used sparingly (focus rings, highlights)
 *
 * Type: Fraunces (display serif) · General Sans (UI/body) · IBM Plex Mono (data)
 */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#F2F4F1',
          100: '#E5EAE1',
          200: '#CCD5C6',
          300: '#AAB9A1',
          400: '#7C9073',
          500: '#55684D',
          600: '#2F3E36',
          700: '#23302A',
          800: '#1A241E',
          900: '#121915',
          950: '#0A0F0C',
        },
        surface: {
          50: '#FAF9F6',
          100: '#F5F0E8',
          200: '#E7E2D8',
          300: '#D6D0C2',
          400: '#8A8A82',
          500: '#6D6C64',
          600: '#55544D',
          700: '#3A3A38',
          800: '#2E2D2A',
          900: '#232220',
          950: '#161514',
        },
        beige: {
          50: '#FAF7F0',
          100: '#F5F0E8',
          200: '#EDE7DA',
          300: '#E2DAC8',
          400: '#CFC5AC',
          500: '#B3A88C',
        },
        brass: {
          50: '#FAF4E9',
          100: '#F3E9D7',
          200: '#E6D5B8',
          300: '#D5BE95',
          400: '#C6A97A',
          500: '#B8945F',
          600: '#A5814E',
          700: '#87693F',
          800: '#6B5334',
          900: '#4A3A25',
        },
      },
      fontFamily: {
        sans: ['"General Sans"', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        serif: ['Fraunces', 'Georgia', '"Times New Roman"', 'serif'],
        display: ['Fraunces', 'Georgia', '"Times New Roman"', 'serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
        urdu: ['Noto Nastaliq Urdu', 'Jameel Noori Nastaleeq', 'serif'],
      },
      boxShadow: {
        'xs': '0 1px 2px 0 rgba(58, 58, 56, 0.05)',
        'sm': '0 1px 3px 0 rgba(58, 58, 56, 0.06), 0 1px 2px -1px rgba(58, 58, 56, 0.05)',
        'md': '0 4px 6px -1px rgba(58, 58, 56, 0.07), 0 2px 4px -2px rgba(58, 58, 56, 0.05)',
        'lg': '0 10px 15px -3px rgba(58, 58, 56, 0.08), 0 4px 6px -4px rgba(58, 58, 56, 0.04)',
        'xl': '0 20px 25px -5px rgba(58, 58, 56, 0.09), 0 8px 10px -6px rgba(58, 58, 56, 0.05)',
        '2xl': '0 25px 50px -12px rgba(35, 48, 42, 0.18)',
        'inner-glow': 'inset 0 1px 0 0 rgba(255, 255, 250, 0.1)',
        'brand': '0 4px 14px 0 rgba(47, 62, 54, 0.28)',
        'card': '0 1px 2px rgba(58, 58, 56, 0.04), 0 10px 28px -14px rgba(58, 58, 56, 0.1)',
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'shimmer': 'shimmer 2s infinite linear',
        'pulse-soft': 'pulseSoft 2s infinite ease-in-out',
        'float': 'float 3s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
      },
    },
  },
  plugins: [],
};

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: { 50:'#EEEDFE', 100:'#D9D8FD', 200:'#B8B5FB', 300:'#9793F9', 400:'#7670F7', 500:'#534AB7', 600:'#3C3489', 700:'#2D2667', 800:'#1E1944', 900:'#0F0C22' },
        accent:  { 500:'#10B981', 600:'#059669' },
      },
      fontFamily: { sans: ['Inter', 'ui-sans-serif', 'system-ui'] },
    },
  },
  plugins: [],
};

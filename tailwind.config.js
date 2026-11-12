/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        sans: ['"DM Sans"', 'sans-serif'],
      },
      colors: {
        canvas: '#F5F2EC',
        ink: '#0F1B33',
        slate: { soft: '#5B6B86' },
        mist: '#ACC6E9',
      },
    },
  },
  plugins: [],
}


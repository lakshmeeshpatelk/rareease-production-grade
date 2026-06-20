/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        black: '#000000',
        white: '#F9F9F7',
        warm: '#D9D2C5',
        sage: '#C3CE94',
        blush: '#FEBDA6',
        gray: '#1a1a1a',
        'mid-gray': '#888888',
      },
      fontFamily: {
        display: ['var(--font-display)', 'sans-serif'],
        serif: ['var(--font-serif)', 'serif'],
        body: ['var(--font-body)', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

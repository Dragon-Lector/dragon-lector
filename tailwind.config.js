/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Playfair Display"', 'Georgia', 'serif'],
        body: ['"DM Sans"', 'sans-serif'],
        mono: ['"DM Mono"', 'monospace'],
      },
      colors: {
        ink: {
          50:  '#f5f0eb',
          100: '#e8ddd2',
          200: '#d4c0a8',
          300: '#b89c7d',
          400: '#9a7a58',
          500: '#7d5f40',
          600: '#634a30',
          700: '#4a3622',
          800: '#312416',
          900: '#1a120a',
        },
        cream: {
          50:  '#fffef9',
          100: '#fdf8ed',
          200: '#faf0d7',
          300: '#f5e4b8',
          400: '#edd498',
          500: '#e2c070',
        },
        scarlet: {
          400: '#e84545',
          500: '#c93232',
          600: '#a82424',
        },
        sage: {
          400: '#7aaa8a',
          500: '#5d9070',
          600: '#447558',
        }
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'reveal': 'reveal 0.6s ease-out',
      },
      keyframes: {
        fadeIn: { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp: { from: { opacity: 0, transform: 'translateY(16px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        reveal: { from: { opacity: 0, transform: 'scale(0.95)' }, to: { opacity: 1, transform: 'scale(1)' } },
      }
    },
  },
  plugins: [],
}

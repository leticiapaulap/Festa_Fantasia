/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      opacity: {
        8: '0.08',
        12: '0.12',
        14: '0.14',
        38: '0.38',
        45: '0.45',
        55: '0.55',
        62: '0.62',
        68: '0.68',
        72: '0.72',
        76: '0.76',
        78: '0.78'
      },
      colors: {
        night: '#0b0712',
        ink: '#15101d',
        velvet: '#6d28d9',
        ember: '#f97316',
        mist: '#f6edf8'
      },
      boxShadow: {
        glow: '0 0 32px rgba(249, 115, 22, 0.18)',
        violet: '0 0 36px rgba(109, 40, 217, 0.24)'
      }
    }
  },
  plugins: []
};

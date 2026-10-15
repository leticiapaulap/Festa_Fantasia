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
        night: '#0d0912',
        ink: '#1c1324',
        velvet: '#765d85',
        ember: '#f47718',
        mist: '#e9d8ba',
        plum: '#25152f'
      },
      boxShadow: {
        glow: '0 0 28px rgba(244, 119, 24, 0.16)',
        violet: '0 0 32px rgba(118, 93, 133, 0.18)'
      }
    }
  },
  plugins: []
};

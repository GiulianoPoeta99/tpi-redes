import tailwindcssAnimate from 'tailwindcss-animate';

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#2563eb', // blue-600
          hover: '#3b82f6', // blue-500
          foreground: '#ffffff',
        },
        secondary: {
          DEFAULT: '#374151', // gray-700
          hover: '#4b5563', // gray-600
          foreground: '#ffffff',
        },
        glass: {
          surface: 'rgba(255, 255, 255, 0.05)',
          hover: 'rgba(255, 255, 255, 0.10)',
          border: 'rgba(255, 255, 255, 0.10)',
          highlight: 'rgba(255, 255, 255, 0.20)',
        },
        status: {
          success: {
            bg: 'rgba(34, 197, 94, 0.1)', // green-500/10
            text: '#4ade80', // green-400
            border: 'rgba(34, 197, 94, 0.2)',
          },
          error: {
            bg: 'rgba(239, 68, 68, 0.1)', // red-500/10
            text: '#f87171', // red-400
            border: 'rgba(239, 68, 68, 0.2)',
          },
          warning: {
            bg: 'rgba(234, 179, 8, 0.1)', // yellow-500/10
            text: '#facc15', // yellow-400
            border: 'rgba(234, 179, 8, 0.2)',
          },
          info: {
            bg: 'rgba(59, 130, 246, 0.1)', // blue-500/10
            text: '#60a5fa', // blue-400
            border: 'rgba(59, 130, 246, 0.2)',
          },
          neutral: {
            bg: 'rgba(107, 114, 128, 0.1)', // gray-500/10
            text: '#9ca3af', // gray-400
            border: 'rgba(107, 114, 128, 0.2)',
          },
        },
      },
    },
  },
  plugins: [tailwindcssAnimate],
};

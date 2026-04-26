/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      colors: {
        cockpit: {
          bg: '#0b0f17',
          panel: '#111827',
          panel2: '#0f1623',
          edge: '#1f2937',
          accent: '#34d399',
          warn: '#fbbf24',
          danger: '#f87171',
          muted: '#9ca3af',
        },
      },
    },
  },
  plugins: [],
};

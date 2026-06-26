/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        purple: {
          primary: '#6F42C1',
          secondary: '#A78BFA',
          light: '#EDE9FE',
          dark: '#4C2E99',
        },
      },
    },
  },
  plugins: [],
}

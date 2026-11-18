/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#0d1117',
        card: '#161b22',
        surface: '#1c2128',
      }
    },
  },
  plugins: [],
}

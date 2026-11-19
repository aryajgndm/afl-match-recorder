/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Bricolage Grotesque"', 'system-ui', 'sans-serif'],
        display: ['"MuseoModerno"', 'system-ui', 'sans-serif'],
      },
      colors: {
        background: '#0d1117',
        card: '#161b22',
        surface: '#1c2128',
      }
    },
  },
  plugins: [],
}

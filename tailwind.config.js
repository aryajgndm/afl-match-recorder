/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Bricolage Grotesque"', 'sans-serif'],
        display: ['ParkinsansG', '"MuseoModerno"', 'cursive', 'sans-serif'],
      },
      colors: {
        background: '#0d1117',
        card: '#161b22',
        surface: '#1c2128',
        accent: {
          DEFAULT: '#BE2041',
          hover: '#a81938',
          dark: '#8a122c',
          light: '#d72b4f',
        },
      }
    },
  },
  plugins: [],
}

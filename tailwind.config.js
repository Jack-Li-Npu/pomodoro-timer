/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'pomodoro-red': '#e74c3c',
        'pomodoro-green': '#27ae60',
        'pomodoro-blue': '#3498db',
      },
    },
  },
  plugins: [],
}


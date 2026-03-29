/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#e6f4ea",
          100: "#cce9d5",
          200: "#99d3ab",
          300: "#66bd81",
          400: "#33a757",
          500: "#00994d",
          600: "#008a45",
          700: "#007a3d",
          800: "#006837",
          900: "#00552d",
        },
      },
    },
  },
};
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}"
  ],
  theme: {
    extend: {
      fontFamily: { sans: ["Inter", "ui-sans-serif", "system-ui"] },
      colors: {
        primary: {
          50: "#eef2ff",100:"#e0e7ff",200:"#c7d2fe",300:"#a5b4fc",400:"#818cf8",
          500:"#6366f1",600:"#4f46e5",700:"#4338ca",800:"#3730a3",900:"#312e81"
        },
        accent: {50:"#fff7ed",100:"#ffedd5",300:"#fdba74",500:"#fb923c"}
      },
      boxShadow: { soft: "0 8px 30px rgba(16,24,40,0.08)" }
    }
  },
  plugins: [],
};

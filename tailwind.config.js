/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        yt: {
          red: "#FF0000",
          dark: {
            bg: "#0F0F0F",
            surface: "#1F1F1F",
            hover: "#272727",
            border: "#303030",
            text: "#F1F1F1",
            muted: "#AAAAAA",
          },
        },
      },
    },
  },
  plugins: [],
};

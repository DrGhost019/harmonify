import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        spotify: {
          green: "#1ed760",
          "green-hover": "#1fdf64",
          "green-active": "#169c46",
          dark: "#121212",
          black: "#000000",
          card: "#181818",
          "card-hover": "#282828",
          subtext: "#b3b3b3",
          muted: "#727272",
        },
      },
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;

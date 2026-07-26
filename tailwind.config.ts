import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#fffdf0",
          100: "#fff9dc",
          200: "#fff4a8",
          300: "#ffea61",
          400: "#ffdd00",
          500: "#f5cc00",
          600: "#d8b100",
          700: "#8a7200",
          800: "#3a3100",
          900: "#161616"
        },
        ink: {
          50: "#fafaf9",
          100: "#f5f5f4",
          200: "#e7e5e4",
          300: "#d6d3d1",
          400: "#a8a29e",
          500: "#78716c",
          600: "#57534e",
          700: "#44403c",
          800: "#292524",
          900: "#1c1917"
        }
      },
      boxShadow: {
        warm: "0 18px 50px rgba(22, 22, 22, 0.14)",
        lift: "0 10px 30px rgba(22, 22, 22, 0.12)"
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Georgia", "serif"]
      }
    },
  },
  plugins: [],
};

export default config;

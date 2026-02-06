import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
        primary: {
          DEFAULT: "#0b57d0", // Google Blue
          foreground: "#ffffff",
          100: "#c2e7ff",
        },
        surface: {
          100: "#f0f4f9", // Lightest background
          200: "#e9eef6", // Hover states
          300: "#dfe3e7",
          500: "#444746", // Icon colors
        },
      },
    },
  },
  plugins: [],
};
export default config;

import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#2dd4bf",
        background: "#0f172a",
        surface: "#1e293b",
        "surface-container": "#0f172a",
        "on-surface": "#f1f5f9",
        "on-surface-variant": "#94a3b8",
        "outline-variant": "#334155",
      },
      fontFamily: {
        headline: ["Inter", "sans-serif"],
        body: ["Inter", "sans-serif"],
        label: ["'Space Grotesk'", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;

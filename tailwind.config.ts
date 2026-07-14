import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: "#2f6bff", dark: "#1f4fd0" },
        accent: "#12b981",
        ink: "#0d1b2a",
      },
    },
  },
  plugins: [],
};
export default config;

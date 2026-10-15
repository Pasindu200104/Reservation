import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#14231f",
        paper: "#f6f8f6",
        brand: {
          DEFAULT: "#1f8f63",
          dark: "#176f4e",
          light: "#e4f4ec",
        },
      },
    },
  },
  plugins: [],
};

export default config;

import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        primary: "#174e4f",
        accent: "#d88a3d",
        surface: "#f5f2eb",
        ink: "#1b1f24",
        muted: "#7a838f"
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.5rem"
      }
    }
  },
  plugins: []
};

export default config;

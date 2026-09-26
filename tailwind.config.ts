import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#10120f",
        panel: "#171a16",
        line: "#292d27",
        muted: "#92978f",
        accent: "#c5f36b",
      },
    },
  },
  plugins: [],
};

export default config;
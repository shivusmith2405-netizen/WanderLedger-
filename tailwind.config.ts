import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        vanilla: {
          DEFAULT: "#FFEBAF",
          cream: "#FFEBAF",
          light: "#FFF9E6",
          soft: "#FFF3D1",
          border: "#E6D090",
          dark: "#D9BE73",
        },
        moonstone: {
          DEFAULT: "#4C9DB0",
          light: "#E6F4F7",
          medium: "#70B5C4",
          hover: "#3D8798",
          dark: "#2D6B78",
          deep: "#235560",
        },
        ink: {
          DEFAULT: "#173842",
          deep: "#173842",
          dark: "#1F4855",
          light: "#2B5F6E",
          muted: "#4F7682",
          subtle: "#8BA6AF",
          faint: "#CBD8DC",
        },
        surface: {
          DEFAULT: "#FFFFFF",
          card: "#FFFFFF",
          muted: "#FAF7EF",
        },
        accent: {
          teal: "#2D6B78",
          gold: "#E6D090",
          coral: "#E06D53",
          emerald: "#2A9D8F",
        },
      },
      borderRadius: {
        "2xl": "20px",
        "3xl": "24px",
        "4xl": "28px",
        "5xl": "32px",
      },
      boxShadow: {
        bento: "0 10px 30px -10px rgba(23, 56, 66, 0.08), 0 4px 12px -2px rgba(23, 56, 66, 0.04)",
        "bento-hover": "0 18px 36px -12px rgba(23, 56, 66, 0.14), 0 8px 16px -4px rgba(23, 56, 66, 0.06)",
        "bento-teal": "0 14px 34px -10px rgba(76, 157, 176, 0.35)",
        "bento-inset": "inset 0 2px 4px rgba(23, 56, 66, 0.04)",
      },
      fontFamily: {
        sans: ["var(--font-outfit)", "system-ui", "-apple-system", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;

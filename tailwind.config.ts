import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./pages/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        background: "#ffffff",
        foreground: "#020617",
        muted: {
          DEFAULT: "#f1f5f9",
          foreground: "#64748b"
        },
        primary: {
          DEFAULT: "#10b981",
          foreground: "#0f172a"
        },
        destructive: {
          DEFAULT: "#f43f5e",
          foreground: "#fff1f2"
        }
      },
      borderRadius: {
        "2xl": "1rem"
      },
      boxShadow: {
        soft: "0 10px 25px -15px rgba(15, 23, 42, 0.25)"
      }
    }
  },
  plugins: []
};

export default config;


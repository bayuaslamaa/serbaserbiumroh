import type { Config } from "tailwindcss"
import typography from "@tailwindcss/typography"

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./content/**/*.mdx",
  ],
  theme: {
    extend: {
      // Nav switches between the desktop bar and the mobile bar at 900px —
      // the condensed desktop row is still cramped at Tailwind's `md` (768px).
      screens: {
        nav: "900px",
      },
      colors: {
        bg: "var(--color-bg)",
        surface: "var(--color-surface)",
        border: "var(--color-border)",
        gold: "var(--color-gold)",
        "gold-muted": "var(--color-gold-muted)",
        "gold-hover": "var(--color-gold-hover)",
        green: "var(--color-green)",
        "green-text": "var(--color-green-text)",
        text: "var(--color-text)",
        "text-muted": "var(--color-text-muted)",
        "text-soft": "var(--color-text-soft)",
        "danger-text": "var(--color-danger-text)",
      },
      animation: {
        "fade-down": "ssuFadeDown 0.18s ease",
      },
      fontFamily: {
        heading: ["var(--font-heading)", "serif"],
        body: ["var(--font-body)", "sans-serif"],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [typography],
}

export default config

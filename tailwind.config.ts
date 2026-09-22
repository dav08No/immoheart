import type { Config } from "tailwindcss"

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  darkMode: ["selector", '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        surface: "var(--surface)",
        "surface-2": "var(--surface-2)",
        "surface-3": "var(--surface-3)",
        ink: "var(--ink)",
        "ink-2": "var(--ink-2)",
        "ink-3": "var(--ink-3)",
        line: "var(--line)",
        "line-2": "var(--line-2)",
        brand: "var(--brand)",
        "brand-2": "var(--brand-2)",
        "on-brand": "var(--on-brand)",
        "brand-soft": "var(--brand-soft)",
        navy: "var(--navy)",
        good: "var(--good)",
        "good-bg": "var(--good-bg)",
        warn: "var(--warn)",
        "warn-bg": "var(--warn-bg)",
        crit: "var(--crit)",
        "crit-bg": "var(--crit-bg)",
      },
      borderRadius: { card: "10px" },
      fontFamily: {
        sans: ["var(--font-outfit)", "Helvetica Neue", "Arial", "sans-serif"],
        display: ["Cambria", "Georgia", "serif"],
      },
    },
  },
  plugins: [],
}

export default config

import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./store/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        surface: "var(--surface)",
        "surface-2": "var(--surface-2)",
        "surface-3": "var(--surface-3)",
        line: "var(--line)",
        "line-strong": "var(--line-strong)",
        ink: "var(--ink)",
        "ink-2": "var(--ink-2)",
        muted: "var(--muted)",
        navy: {
          DEFAULT: "var(--navy)",
          2: "var(--navy-2)",
          3: "var(--navy-3)",
          soft: "var(--navy-soft)",
        },
        gold: {
          DEFAULT: "var(--gold)",
          2: "var(--gold-2)",
          soft: "var(--gold-soft)",
        },
        google: "var(--s-google)",
        youtube: "var(--s-youtube)",
        tiktok: "var(--s-tiktok)",
        good: "var(--good)",
        "good-text": "var(--good-text)",
        warn: "var(--warn)",
        "warn-text": "var(--warn-text)",
        crit: "var(--crit)",
      },
      borderRadius: {
        card: "var(--radius-card)",
      },
      boxShadow: {
        card: "var(--shadow-card)",
        float: "var(--shadow-float)",
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;

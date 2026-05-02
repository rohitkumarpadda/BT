/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["'Syne'", "sans-serif"],
        body:     ["'DM Sans'", "sans-serif"],
        mono:     ["'JetBrains Mono'", "monospace"],
      },
      colors: {
        ink:    "#0D0D0F",
        paper:  "#F5F3EE",
        slate:  "#1C1C22",
        mist:   "#E8E5DE",
        signal: "#FF5C00",
        pulse:  "#00D4AA",
        volt:   "#C8FF00",
        dim:    "#6B6B78",
      },
      animation: {
        "fade-up":    "fadeUp 0.4s ease-out forwards",
        "fade-in":    "fadeIn 0.3s ease-out forwards",
        "pulse-slow": "pulse 3s cubic-bezier(0.4,0,0.6,1) infinite",
        "spin-slow":  "spin 4s linear infinite",
      },
      keyframes: {
        fadeUp: {
          "0%":   { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          "0%":   { opacity: "0" },
          "100%": { opacity: "1" },
        },
      },
      boxShadow: {
        "card":  "0 1px 3px rgba(0,0,0,0.08), 0 8px 32px rgba(0,0,0,0.06)",
        "hover": "0 4px 20px rgba(0,0,0,0.12), 0 16px 48px rgba(0,0,0,0.08)",
        "glow":  "0 0 24px rgba(200,255,0,0.25)",
      },
    },
  },
  plugins: [],
};

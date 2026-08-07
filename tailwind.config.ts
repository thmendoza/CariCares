import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Legacy namespace — kept as a safety net until every consumer has
        // migrated to `care.*` below (24+ files reference these for
        // load-bearing meaning like severity/status colors). Do not delete
        // until a repo-wide grep for `brand-` / `brand.` comes back empty.
        brand: {
          pink: "#F472B6",
          "pink-mid": "#FBCFE8",
          "pink-light": "#FDF2F8",
          green: "#4ADE80",
          "green-light": "#F0FDF4",
          red: "#F87171",
          "red-light": "#FEF2F2",
        },
        // I-CARe warm Montessori palette (redesign sprint).
        care: {
          pink: "#F4A6C1",
          // Deeper, WCAG-accessible pink for interactive elements that
          // carry text (buttons, links, secondary-button text) — the soft
          // base `pink` above is ~1.9:1 with white and fails contrast for
          // anything but decorative backgrounds/badge chips.
          "pink-deep": "#E31D62",
          "pink-mid": "#FBDCE8",
          "pink-light": "#FDF3F6",
          green: "#8FBF8A",
          "green-deep": "#487B43",
          "green-light": "#F1F7EE",
          peach: "#F6C9A0",
          sage: "#B7C9A8",
          olive: "#A9AE7C",
          ivory: "#FBF7EF",
          cream: "#F5EFE2",
          red: "#E08A7D",
          "red-deep": "#C3422E",
          "red-light": "#FBEEEA",
          charcoal: "#3F3A36",
          muted: "#7A7168",
        },
        // Real Lovable design-system tokens (oklch, driven by CSS variables
        // in app/globals.css). This is the site's actual look going
        // forward; `care.*`/`brand.*` above stay only because
        // lib/severity-styles.ts and other logic-bearing files key off them
        // for semantic (severity/status) meaning, not pure aesthetics.
        background: "var(--background)",
        foreground: "var(--foreground)",
        card: "var(--card)",
        "card-foreground": "var(--card-foreground)",
        popover: "var(--popover)",
        "popover-foreground": "var(--popover-foreground)",
        primary: "var(--primary)",
        "primary-foreground": "var(--primary-foreground)",
        secondary: "var(--secondary)",
        "secondary-foreground": "var(--secondary-foreground)",
        muted: "var(--muted)",
        "muted-foreground": "var(--muted-foreground)",
        accent: "var(--accent)",
        "accent-foreground": "var(--accent-foreground)",
        destructive: "var(--destructive)",
        "destructive-foreground": "var(--destructive-foreground)",
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
        ivory: "var(--ivory)",
        cream: "var(--cream)",
        peach: "var(--peach)",
        sage: "var(--sage)",
        olive: "var(--olive)",
        pink: "var(--pink)",
        green: "var(--green)",
      },
      borderRadius: {
        card: "12px",
        "card-lg": "20px",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Nunito", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Fraunces", "Georgia", "serif"],
      },
      fontSize: {
        display: ["3.25rem", { lineHeight: "1.1", fontWeight: "700" }],
        h1: ["1.75rem", { lineHeight: "1.25", fontWeight: "700" }],
        h2: ["1.25rem", { lineHeight: "1.3", fontWeight: "600" }],
        h3: ["1rem", { lineHeight: "1.4", fontWeight: "600" }],
      },
      boxShadow: {
        paper: "var(--shadow-paper)",
        lift: "var(--shadow-lift)",
      },
      backgroundImage: {
        "gradient-warm": "var(--gradient-warm)",
        "gradient-hero-veil": "var(--gradient-hero-veil)",
      },
      keyframes: {
        "bounce-in": {
          "0%": { transform: "scale(0.8)", opacity: "0" },
          "60%": { transform: "scale(1.05)", opacity: "1" },
          "100%": { transform: "scale(1)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "cari-float": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        "cari-wave": {
          "0%, 100%": { transform: "rotate(-3deg) translateY(0)" },
          "50%": { transform: "rotate(3deg) translateY(-6px)" },
        },
      },
      animation: {
        "bounce-in": "bounce-in 0.4s ease-out",
        float: "float 6s ease-in-out infinite",
        "fade-in": "fade-in 0.5s ease-out",
        "fade-in-up": "fade-in-up 0.6s ease-out",
        "float-slow": "cari-float 6s ease-in-out infinite",
        "wave-slow": "cari-wave 3.2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
export default config;

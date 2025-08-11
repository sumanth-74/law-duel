import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./client/index.html", "./client/src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
        },
        popover: {
          DEFAULT: "var(--popover)",
          foreground: "var(--popover-foreground)",
        },
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--secondary-foreground)",
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
        },
        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--destructive-foreground)",
        },
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
        chart: {
          "1": "var(--chart-1)",
          "2": "var(--chart-2)",
          "3": "var(--chart-3)",
          "4": "var(--chart-4)",
          "5": "var(--chart-5)",
        },
        // Custom brand colors
        "dark-bg": "var(--dark-bg)",
        panel: "var(--panel)",
        "panel-2": "var(--panel-2)",
        arcane: "var(--arcane)",
        "mystic-gold": "var(--mystic-gold)",
        success: "var(--success)",
        danger: "var(--danger)",
        ink: "var(--ink)",
      },
      fontFamily: {
        sans: ["var(--font-sans)"],
        serif: ["var(--font-serif)"],
        mono: ["var(--font-mono)"],
        cinzel: ["var(--font-cinzel)"],
        inter: ["var(--font-inter)"],
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
        "pulse-glow": {
          "0%, 100%": {
            boxShadow: "0 0 20px hsla(235, 85%, 63%, 0.3), 0 12px 28px hsla(235, 85%, 63%, 0.35)",
          },
          "50%": {
            boxShadow: "0 0 30px hsla(235, 85%, 63%, 0.6), 0 16px 32px hsla(235, 85%, 63%, 0.45)",
          },
        },
        "reveal-slide": {
          from: {
            opacity: "0",
            transform: "translateY(20px)",
          },
          to: {
            opacity: "1",
            transform: "translateY(0)",
          },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        "reveal-slide": "reveal-slide 0.6s ease-out",
      },
      backdropBlur: {
        xs: "2px",
      },
      boxShadow: {
        "glow": "0 0 20px hsla(235, 85%, 63%, 0.3)",
        "glow-lg": "0 0 30px hsla(235, 85%, 63%, 0.6)",
        "panel": "0 14px 40px hsla(0, 0%, 0%, 0.45), inset 0 1px 0 hsla(0, 0%, 100%, 0.04)",
        "avatar": "0 12px 24px hsla(0, 0%, 0%, 0.55)",
      },
      backgroundImage: {
        "brand-gradient": "var(--bg-grad)",
        "conic-avatar": "conic-gradient(from 210deg, #5837ff, #a642ff, #5ad6ff, #5837ff)",
      },
      spacing: {
        "18": "4.5rem",
        "88": "22rem",
      },
      minHeight: {
        "44": "2.75rem", // 44px for accessibility
      },
      fontSize: {
        "2xs": ["0.625rem", { lineHeight: "0.75rem" }],
      },
    },
  },
  plugins: [
    require("tailwindcss-animate"), 
    require("@tailwindcss/typography"),
    // Custom plugin for brand colors and utilities
    function({ addUtilities, theme }) {
      const newUtilities = {
        '.text-shadow-sm': {
          textShadow: '0 1px 2px rgba(0, 0, 0, 0.5)',
        },
        '.text-shadow': {
          textShadow: '0 2px 4px rgba(0, 0, 0, 0.5)',
        },
        '.text-shadow-lg': {
          textShadow: '0 4px 8px rgba(0, 0, 0, 0.5)',
        },
        '.backdrop-saturate-120': {
          backdropFilter: 'saturate(120%) blur(6px)',
        },
        '.mask-radial': {
          '-webkit-mask': 'radial-gradient(circle at 60% 35%, transparent 18px, black 19px), linear-gradient(black, black)',
          'mask': 'radial-gradient(circle at 60% 35%, transparent 18px, black 19px), linear-gradient(black, black)',
        },
      }
      addUtilities(newUtilities)
    }
  ],
} satisfies Config;

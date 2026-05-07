import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./hooks/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          '"Pretendard JP Variable"',
          '"Pretendard JP"',
          '"Pretendard Variable"',
          '"Pretendard"',
          "-apple-system",
          "BlinkMacSystemFont",
          "system-ui",
          '"Hiragino Sans"',
          '"Apple SD Gothic Neo"',
          '"Segoe UI"',
          "Roboto",
          "sans-serif",
        ],
      },
      colors: {
        onair: {
          bg: "#0b0b10",
          panel: "#15151d",
          line: "#26262f",
          ink: "#f4f4f8",
          mute: "#9aa0aa",
          live: "#ff2d55",
          warn: "#ffb020",
        },
      },
      keyframes: {
        floatUp: {
          "0%": { transform: "translateY(0) scale(1)", opacity: "1" },
          "70%": { opacity: "1" },
          "100%": { transform: "translateY(-160px) scale(1.4)", opacity: "0" },
        },
        pulseLive: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.4" },
        },
      },
      animation: {
        floatUp: "floatUp 5s ease-out forwards",
        pulseLive: "pulseLive 1.4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;

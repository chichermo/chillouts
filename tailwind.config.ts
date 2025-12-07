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
        'brand-pink': '#E897A3',
        'brand-green': '#ACE1AF',
        'brand-orange': '#FFDFB9',
        'brand-gray': '#9F9EA8',
        'brand-blue': '#C2E0FC',
        'brand-black': '#000000',
      },
      fontFamily: {
        'sans': ['Arial', 'Arial Rounded MT Bold', 'sans-serif'],
        'rounded': ['Arial Rounded MT Bold', 'Arial', 'sans-serif'],
      },
      fontSize: {
        'body': '12pt',
        'subtitle': '18pt',
        'title': '22pt',
      },
    },
  },
  plugins: [],
};
export default config;


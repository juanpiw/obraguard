import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{html,ts}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', '"Plus Jakarta Sans"', 'sans-serif'],
        display: ['"Space Grotesk"', 'Inter', 'sans-serif']
      }
    }
  },
  plugins: []
};

export default config;



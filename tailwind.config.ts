import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}'
  ],
  theme: {
    extend: {
      colors: {
        ink: '#0A0A0A',
        graphite: '#111827',
        electric: '#3B82F6'
      },
      fontFamily: {
        sans: ['Inter', 'Montserrat', 'Poppins', 'system-ui', 'sans-serif']
      },
      boxShadow: {
        glow: '0 0 60px rgba(59, 130, 246, 0.22)'
      }
    }
  },
  plugins: []
};

export default config;

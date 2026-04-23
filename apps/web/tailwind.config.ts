import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    '../../packages/ui/src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#E1C44D',
          foreground: '#1A1A1A',
        },
        secondary: {
          DEFAULT: '#5F5C48',
          foreground: '#FFFFFF',
        },
        background: '#F8F8F6',
        surface: '#FFFFFF',
        border: '#E5E7EB',
        status: {
          delivered: '#10B981',
          'in-transit': '#3B82F6',
          funding: '#E1C44D',
          cancelled: '#EF4444',
          pending: '#F59E0B',
          committed: '#10B981',
        },
      },
      fontFamily: {
        sans: ['Poppins', 'sans-serif'],
      },
      borderRadius: {
        card: '12px',
        input: '8px',
        badge: '20px',
        button: '8px',
      },
    },
  },
  plugins: [],
};

export default config;

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9ff',
          500: '#3b82f6',
          600: '#1d4ed8',
          700: '#1e3a8a',
          800: '#1e40af',
          900: '#0f172a',
        },
        navy: {
          light: '#112240',
          DEFAULT: '#0a192f',
          dark: '#020c1b',
        },
        gold: {
          light: '#fde047',
          DEFAULT: '#d4af37',
          premium: '#c5a028',
        },
        secondary: {
          50: '#f8fafc',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}


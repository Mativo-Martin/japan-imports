/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          50: '#f0f3f7',
          100: '#dde4f0',
          500: '#001524',
          900: '#000a12',
        },
        teal: {
          50: '#e3f4f6',
          500: '#15616d',
          700: '#0d3f47',
        },
        orange: {
          50: '#fff3e0',
          500: '#ff7d00',
          700: '#d66b00',
        },
        rust: {
          50: '#fef0ed',
          500: '#78290f',
          700: '#5a1d08',
        },
        cream: '#ffecd1',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        heading: ['Space Grotesk', 'system-ui', 'sans-serif'],
      },
      spacing: {
        6: '6px',
        10: '10px',
        14: '14px',
        20: '20px',
      },
      borderRadius: {
        6: '6px',
        10: '10px',
        14: '14px',
        20: '20px',
      },
      boxShadow: {
        sm: '0 1px 2px 0 rgba(0, 21, 36, 0.05)',
        md: '0 4px 6px -1px rgba(0, 21, 36, 0.1)',
        lg: '0 10px 15px -3px rgba(0, 21, 36, 0.15)',
      },
    },
  },
  plugins: [],
}

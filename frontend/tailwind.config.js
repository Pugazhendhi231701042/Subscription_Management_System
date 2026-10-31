/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        odoo: {
          purple: '#714B67',
          dark: '#017E84',
          teal: '#00A09D',
          gold: '#F0AD4E',
          gray: '#F8F9FA',
          border: '#E2E8F0',
          darkBg: '#1F2937'
        }
      }
    },
  },
  plugins: [],
}

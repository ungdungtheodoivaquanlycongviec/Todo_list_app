import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      screens: {
        'xs': '475px',  // Extra small breakpoint
        // Default breakpoints: sm: 640px, md: 768px, lg: 1024px, xl: 1280px
      },
      spacing: {
        '92': '23rem',  // Custom spacing for kanban columns
      },
    },
  },
  plugins: [],
}

export default config
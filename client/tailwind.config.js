/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Signature colour: a confident coral / vermilion (editorial, warm, human)
        brand: {
          50: '#fcf2ee',
          100: '#f9e0d6',
          200: '#f3c2ae',
          300: '#ec9d7f',
          400: '#e37450',
          500: '#d9542f',
          600: '#c4441f',
          700: '#a3361a',
          800: '#832d1a',
          900: '#6b2718',
          950: '#3a1109',
        },
        // Secondary accent: a deep pine green, used sparingly (success, verified)
        accent: {
          50: '#ecf5f0',
          400: '#3f9e7f',
          500: '#1e8060',
          600: '#146b50',
          700: '#0f5641',
        },
        // Warm near-black ink scale — the backbone of an editorial look
        ink: {
          50: '#f6f3ec',
          100: '#ece6da',
          200: '#ddd5c4',
          300: '#c0b6a1',
          400: '#8b8069',
          500: '#6b6152',
          600: '#4d453a',
          700: '#37312a',
          800: '#26221c',
          900: '#1a1713',
          950: '#0f0d0a',
        },
        // Surfaces
        paper: '#f4f0e7', // warm cream page background
        surface: '#fffdf8', // warm white for cards
      },
      fontFamily: {
        sans: ['Satoshi', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['Fraunces', 'Georgia', 'serif'],
      },
      boxShadow: {
        soft: '0 1px 2px rgba(26,23,19,0.05), 0 1px 3px rgba(26,23,19,0.06)',
        card: '0 1px 0 rgba(26,23,19,0.04), 0 14px 30px -18px rgba(26,23,19,0.22)',
        lift: '0 20px 44px -22px rgba(26,23,19,0.34)',
        press: 'inset 0 2px 0 rgba(26,23,19,0.12)',
      },
      backgroundImage: {
        // Flat coral (kept as a token so existing bg-brand-gradient usages become
        // a solid, editorial colour — no rainbow gradients anywhere).
        'brand-gradient': 'linear-gradient(0deg, #d9542f, #d9542f)',
        'brand-gradient-soft': 'linear-gradient(0deg, #e37450, #e37450)',
        mesh: 'none',
        grain:
          "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.4'/%3E%3C/svg%3E\")",
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.5s cubic-bezier(0.22,1,0.36,1) both',
      },
    },
  },
  plugins: [],
};

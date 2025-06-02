
import type {Config} from 'tailwindcss';

export default {
  darkMode: ['class'], // Or 'media' or remove if not using dark mode with Tailwind directly
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#1677ff', dark: '#0050b3' },
        secondary: { DEFAULT: '#5A5A5A', light: '#F0F0F0' },
        accent: '#FAAD14',
        success: '#52C41A',
        warning: '#FA8C16',
        danger: '#FF4D4F',
        'light-gray': '#f8f9fa',
        'dark-text': '#333333',
        // Re-defining ShadCN variables in case they are used by existing ui components
        // It's better to migrate components or ensure AntD theming covers all needs.
        background: 'hsl(var(--background))', // Example: keep if ShadCN components remain
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        // primary: { // Already defined above
        //   DEFAULT: 'hsl(var(--primary))',
        //   foreground: 'hsl(var(--primary-foreground))',
        // },
        // secondary: { // Already defined above
        //   DEFAULT: 'hsl(var(--secondary))',
        //   foreground: 'hsl(var(--secondary-foreground))',
        // },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        // accent: { // Already defined above
        //   DEFAULT: 'hsl(var(--accent))',
        //   foreground: 'hsl(var(--accent-foreground))',
        // },
        destructive: { // 'danger' is used above, this is for ShadCN
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        serif: ['Merriweather', 'serif'],
        // body, headline, code from previous config are replaced by sans/serif
        // code: ['monospace', 'monospace'], // Retained from previous if needed
      },
      borderRadius: {
        DEFAULT: '6px',
        lg: '10px',
        md: 'calc(6px - 2px)', // Corresponds to var(--radius)
        sm: 'calc(6px - 4px)',
      },
      keyframes: {
        'accordion-down': {
          from: {
            height: '0',
          },
          to: {
            height: 'var(--radix-accordion-content-height)',
          },
        },
        'accordion-up': {
          from: {
            height: 'var(--radix-accordion-content-height)',
          },
          to: {
            height: '0',
          },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate'), require('@tailwindcss/forms')],
} satisfies Config;

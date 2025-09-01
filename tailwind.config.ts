
import type {Config} from 'tailwindcss';

export default {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './design/**/*.{html,css}',
  ],
  theme: {
    extend: {
      colors: {
        // Design System Primary Colors
        primary: {
          50: 'var(--color-primary-50)',
          100: 'var(--color-primary-100)',
          500: 'var(--color-primary-500)',
          600: 'var(--color-primary-600)',
          700: 'var(--color-primary-700)',
          DEFAULT: 'var(--color-primary-500)',
          dark: 'var(--color-primary-700)',
        },
        // Design System Secondary Colors
        secondary: {
          500: 'var(--color-secondary-500)',
          600: 'var(--color-secondary-600)',
          DEFAULT: 'var(--color-secondary-500)',
          light: 'var(--color-neutral-100)',
        },
        // Design System Accent Colors
        accent: {
          pink: 'var(--color-accent-pink)',
          orange: 'var(--color-accent-orange)',
          cyan: 'var(--color-accent-cyan)',
          blue: 'var(--color-accent-blue)',
          DEFAULT: 'var(--color-accent-orange)',
        },
        // Design System Neutral Colors
        neutral: {
          50: 'var(--color-neutral-50)',
          100: 'var(--color-neutral-100)',
          200: 'var(--color-neutral-200)',
          300: 'var(--color-neutral-300)',
          400: 'var(--color-neutral-400)',
          500: 'var(--color-neutral-500)',
          600: 'var(--color-neutral-600)',
          700: 'var(--color-neutral-700)',
          800: 'var(--color-neutral-800)',
          900: 'var(--color-neutral-900)',
        },
        // Design System Semantic Colors
        success: 'var(--color-success)',
        warning: 'var(--color-warning)',
        danger: 'var(--color-error)',
        error: 'var(--color-error)',
        info: 'var(--color-info)',
        // Legacy colors for backward compatibility
        'light-gray': 'var(--color-neutral-100)',
        'dark-text': 'var(--color-neutral-800)',
        // ShadCN compatibility colors
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
      },
      // Design System Gradients
      backgroundImage: {
        'gradient-primary': 'var(--gradient-primary)',
        'gradient-secondary': 'var(--gradient-secondary)',
        'gradient-tertiary': 'var(--gradient-tertiary)',
        'gradient-background': 'var(--gradient-background)',
        'gradient-card': 'var(--gradient-card)',
        'gradient-sidebar': 'var(--gradient-sidebar)',
        'gradient-search-bar': 'var(--gradient-search-bar)',
        'gradient-progress': 'var(--gradient-progress)',
        'gradient-chart': 'var(--gradient-chart)',
        'gradient-shimmer': 'var(--gradient-shimmer)',
        'gradient-glow': 'var(--gradient-glow)',
      },
      // Design System Typography
      fontFamily: {
        sans: ['var(--font-family-primary)', 'Inter', 'sans-serif'],
        serif: ['Merriweather', 'serif'],
        primary: ['var(--font-family-primary)'],
      },
      fontSize: {
        xs: 'var(--font-size-xs)',
        sm: 'var(--font-size-sm)',
        base: 'var(--font-size-base)',
        lg: 'var(--font-size-lg)',
        xl: 'var(--font-size-xl)',
        '2xl': 'var(--font-size-2xl)',
        '3xl': 'var(--font-size-3xl)',
        '4xl': 'var(--font-size-4xl)',
      },
      fontWeight: {
        normal: 'var(--font-weight-normal)',
        medium: 'var(--font-weight-medium)',
        semibold: 'var(--font-weight-semibold)',
        bold: 'var(--font-weight-bold)',
        extrabold: 'var(--font-weight-extrabold)',
      },
      lineHeight: {
        tight: 'var(--line-height-tight)',
        normal: 'var(--line-height-normal)',
        relaxed: 'var(--line-height-relaxed)',
      },
      letterSpacing: {
        tight: 'var(--letter-spacing-tight)',
        normal: 'var(--letter-spacing-normal)',
        wide: 'var(--letter-spacing-wide)',
      },
      // Design System Spacing
      spacing: {
        xs: 'var(--spacing-xs)',
        sm: 'var(--spacing-sm)',
        md: 'var(--spacing-md)',
        lg: 'var(--spacing-lg)',
        xl: 'var(--spacing-xl)',
        '2xl': 'var(--spacing-2xl)',
        '3xl': 'var(--spacing-3xl)',
        '4xl': 'var(--spacing-4xl)',
        '5xl': 'var(--spacing-5xl)',
        '6xl': 'var(--spacing-6xl)',
      },
      // Design System Border Radius
      borderRadius: {
        xs: 'var(--border-radius-xs)',
        sm: 'var(--border-radius-sm)',
        md: 'var(--border-radius-md)',
        lg: 'var(--border-radius-lg)',
        xl: 'var(--border-radius-xl)',
        '2xl': 'var(--border-radius-2xl)',
        full: 'var(--border-radius-full)',
        DEFAULT: 'var(--border-radius-md)',
      },
      // Design System Box Shadows
      boxShadow: {
        xs: 'var(--shadow-xs)',
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
        xl: 'var(--shadow-xl)',
        '2xl': 'var(--shadow-2xl)',
        glow: 'var(--shadow-glow)',
        'glow-lg': 'var(--shadow-glow-lg)',
        DEFAULT: 'var(--shadow-md)',
      },
      // Design System Animations
      transitionDuration: {
        fast: 'var(--duration-fast)',
        normal: 'var(--duration-normal)',
        slow: 'var(--duration-slow)',
        DEFAULT: 'var(--duration-normal)',
      },
      transitionTimingFunction: {
        'ease-out': 'var(--easing-ease-out)',
        'ease-in': 'var(--easing-ease-in)',
        'ease-in-out': 'var(--easing-ease-in-out)',
        bounce: 'var(--easing-bounce)',
        DEFAULT: 'var(--easing-ease-out)',
      },
      // Design System Keyframes
      keyframes: {
        // Design System Animations
        slideInUp: {
          '0%': {
            transform: 'translateY(30px)',
            opacity: '0',
          },
          '100%': {
            transform: 'translateY(0)',
            opacity: '1',
          },
        },
        progressShine: {
          '0%': {
            transform: 'translateX(-100%)',
          },
          '100%': {
            transform: 'translateX(100%)',
          },
        },
        float: {
          '0%, 100%': {
            transform: 'translateY(0px) rotate(0deg)',
          },
          '25%': {
            transform: 'translateY(-8px) rotate(1deg)',
          },
          '50%': {
            transform: 'translateY(-15px) rotate(0deg)',
          },
          '75%': {
            transform: 'translateY(-8px) rotate(-1deg)',
          },
        },
        pulse: {
          '0%, 100%': {
            transform: 'scale(1)',
          },
          '50%': {
            transform: 'scale(1.05)',
          },
        },
        glow: {
          '0%, 100%': {
            boxShadow: 'var(--shadow-glow)',
          },
          '50%': {
            boxShadow: 'var(--shadow-glow-lg)',
          },
        },
        shimmer: {
          '0%': {
            transform: 'translateX(-100%)',
          },
          '100%': {
            transform: 'translateX(100%)',
          },
        },
        // Legacy ShadCN animations
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
      // Design System Animation Classes
      animation: {
        'slide-in-up': 'slideInUp var(--duration-slow) var(--easing-ease-out)',
        'progress-shine': 'progressShine 2s infinite',
        float: 'float 6s ease-in-out infinite',
        pulse: 'pulse 2s infinite',
        glow: 'glow 2s infinite',
        shimmer: 'shimmer 2s infinite',
        // Legacy ShadCN animations
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
      // Design System Component Sizes
      width: {
        sidebar: 'var(--sidebar-width)',
      },
      height: {
        header: 'var(--header-height)',
        button: 'var(--button-height)',
        input: 'var(--input-height)',
      },
      backdropBlur: {
        DEFAULT: 'var(--backdrop-blur)',
      },
    },
  },
  plugins: [require('tailwindcss-animate'), require('@tailwindcss/forms')],
} satisfies Config;

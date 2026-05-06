import type { Config } from 'tailwindcss';
import tailwindcssAnimate from 'tailwindcss-animate';

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Escala 50-900 del template (landing pública). No usar en módulos del ERP.
        primary: {
          '50': 'var(--color-primary-50)',
          '100': 'var(--color-primary-100)',
          '200': 'var(--color-primary-200)',
          '300': 'var(--color-primary-300)',
          '400': 'var(--color-primary-400)',
          '500': 'var(--color-primary-500)',
          '600': 'var(--color-primary-600)',
          '700': 'var(--color-primary-700)',
          '800': 'var(--color-primary-800)',
          '900': 'var(--color-primary-900)',
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          '50': 'var(--color-secondary-50)',
          '100': 'var(--color-secondary-100)',
          '200': 'var(--color-secondary-200)',
          '300': 'var(--color-secondary-300)',
          '400': 'var(--color-secondary-400)',
          '500': 'var(--color-secondary-500)',
          '600': 'var(--color-secondary-600)',
          '700': 'var(--color-secondary-700)',
          '800': 'var(--color-secondary-800)',
          '900': 'var(--color-secondary-900)',
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
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
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        chart: {
          '1': 'hsl(var(--chart-1))',
          '2': 'hsl(var(--chart-2))',
          '3': 'hsl(var(--chart-3))',
          '4': 'hsl(var(--chart-4))',
          '5': 'hsl(var(--chart-5))',
        },

        // === V1 Slate — tokens canónicos del ERP ===
        // Uso directo: bg-orion-bg, text-orion-fg-muted, border-orion-border, etc.
        orion: {
          bg: 'var(--orion-bg)',
          'bg-subtle': 'var(--orion-bg-subtle)',
          'bg-muted': 'var(--orion-bg-muted)',
          'bg-hover': 'var(--orion-bg-hover)',
          border: 'var(--orion-border)',
          'border-strong': 'var(--orion-border-strong)',
          fg: 'var(--orion-fg)',
          'fg-muted': 'var(--orion-fg-muted)',
          'fg-subtle': 'var(--orion-fg-subtle)',
          'fg-faint': 'var(--orion-fg-faint)',
        },

        // Tenant accents (también accesibles via var(--accent) en CSS)
        idex: {
          DEFAULT: 'var(--orion-idex)',
          soft: 'var(--orion-idex-soft)',
          fg: 'var(--orion-idex-fg)',
        },
        agro: {
          DEFAULT: 'var(--orion-agro)',
          soft: 'var(--orion-agro-soft)',
          fg: 'var(--orion-agro-fg)',
        },
        dignita: {
          DEFAULT: 'var(--orion-dignita)',
          soft: 'var(--orion-dignita-soft)',
          fg: 'var(--orion-dignita-fg)',
        },

        // Semantic V1 (independiente de shadcn destructive)
        success: {
          DEFAULT: 'var(--orion-success)',
          soft: 'var(--orion-success-soft)',
          fg: 'var(--orion-success-fg)',
        },
        warn: {
          DEFAULT: 'var(--orion-warn)',
          soft: 'var(--orion-warn-soft)',
          fg: 'var(--orion-warn-fg)',
        },
        danger: {
          DEFAULT: 'var(--orion-danger)',
          soft: 'var(--orion-danger-soft)',
          fg: 'var(--orion-danger-fg)',
        },
        info: {
          DEFAULT: 'var(--orion-info)',
          soft: 'var(--orion-info-soft)',
          fg: 'var(--orion-info-fg)',
        },

        // Acento dinámico de tenant (cambia según wrapper .tenant-*)
        'tenant-accent': 'var(--accent)',
        'tenant-accent-soft': 'var(--accent-soft)',
        'tenant-accent-fg': 'var(--accent-fg)',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['var(--font-jetbrains-mono)', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        sm: 'var(--orion-r-sm)',
        md: 'var(--orion-r-md)',
        lg: 'var(--orion-r-lg)',
        xl: 'var(--orion-r-xl)',
      },
      boxShadow: {
        'orion-1': 'var(--orion-sh-1)',
        'orion-2': 'var(--orion-sh-2)',
        'orion-3': 'var(--orion-sh-3)',
        'orion-pop': 'var(--orion-sh-pop)',
      },
    },
  },
  plugins: [tailwindcssAnimate],
};

export default config;

import type { Config } from 'tailwindcss';

/**
 * Material 3 Expressive トークンを Tailwind theme にマッピングする。
 * 値は styles/m3-tokens.css の CSS カスタムプロパティを参照するため、
 * ランタイムでダークテーマ／動的カラー（HCT）にも追従する。
 */
const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        // Color roles (Material 3)
        primary: 'var(--md-sys-color-primary)',
        'on-primary': 'var(--md-sys-color-on-primary)',
        'primary-container': 'var(--md-sys-color-primary-container)',
        'on-primary-container': 'var(--md-sys-color-on-primary-container)',
        secondary: 'var(--md-sys-color-secondary)',
        'on-secondary': 'var(--md-sys-color-on-secondary)',
        'secondary-container': 'var(--md-sys-color-secondary-container)',
        'on-secondary-container': 'var(--md-sys-color-on-secondary-container)',
        tertiary: 'var(--md-sys-color-tertiary)',
        'on-tertiary': 'var(--md-sys-color-on-tertiary)',
        'tertiary-container': 'var(--md-sys-color-tertiary-container)',
        'on-tertiary-container': 'var(--md-sys-color-on-tertiary-container)',
        error: 'var(--md-sys-color-error)',
        'on-error': 'var(--md-sys-color-on-error)',
        'error-container': 'var(--md-sys-color-error-container)',
        'on-error-container': 'var(--md-sys-color-on-error-container)',
        outline: 'var(--md-sys-color-outline)',
        'outline-variant': 'var(--md-sys-color-outline-variant)',
        // Surface tones
        'surface-dim': 'var(--md-sys-color-surface-dim)',
        surface: 'var(--md-sys-color-surface)',
        'surface-bright': 'var(--md-sys-color-surface-bright)',
        'surface-container-lowest': 'var(--md-sys-color-surface-container-lowest)',
        'surface-container-low': 'var(--md-sys-color-surface-container-low)',
        'surface-container': 'var(--md-sys-color-surface-container)',
        'surface-container-high': 'var(--md-sys-color-surface-container-high)',
        'surface-container-highest': 'var(--md-sys-color-surface-container-highest)',
        'on-surface': 'var(--md-sys-color-on-surface)',
        'on-surface-variant': 'var(--md-sys-color-on-surface-variant)',
      },
      // Indesignative / inverse
      inverseSurface: 'var(--md-sys-color-inverse-surface)',
      inverseOnSurface: 'var(--md-sys-color-inverse-on-surface)',
      inversePrimary: 'var(--md-sys-color-inverse-primary)',
      borderRadius: {
        'm3-none': '0px',
        'm3-xs': '4px',
        'm3-sm': '8px',
        'm3-md': '12px',
        'm3-lg': '16px',
        'm3-lg-inc': '20px',
        'm3-xl': '28px',
        'm3-xl-inc': '32px',
        'm3-xxl': '48px',
        'm3-full': '9999px',
      },
      boxShadow: {
        'm3-elevation-1': 'var(--md-sys-elevation-1)',
        'm3-elevation-2': 'var(--md-sys-elevation-2)',
        'm3-elevation-3': 'var(--md-sys-elevation-3)',
        'm3-elevation-4': 'var(--md-sys-elevation-4)',
        'm3-elevation-5': 'var(--md-sys-elevation-5)',
      },
      fontFamily: {
        display: ['var(--md-sys-font-display)', 'system-ui', 'sans-serif'],
        headline: ['var(--md-sys-font-headline)', 'system-ui', 'sans-serif'],
        title: ['var(--md-sys-font-title)', 'system-ui', 'sans-serif'],
        body: ['var(--md-sys-font-body)', 'system-ui', 'sans-serif'],
        label: ['var(--md-sys-font-label)', 'system-ui', 'sans-serif'],
      },
      textColor: {
        'on-surface': 'var(--md-sys-color-on-surface)',
        'on-surface-variant': 'var(--md-sys-color-on-surface-variant)',
      },
    },
  },
  plugins: [],
};

export default config;

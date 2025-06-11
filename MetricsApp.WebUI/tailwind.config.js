/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Theme-aware colors using CSS variables
        themed: {
          'bg-primary': 'var(--bg-primary)',
          'bg-secondary': 'var(--bg-secondary)',
          'bg-tertiary': 'var(--bg-tertiary)',
          'bg-elevated': 'var(--bg-elevated)',
          'bg-surface': 'var(--bg-surface)',
          
          'text-primary': 'var(--text-primary)',
          'text-secondary': 'var(--text-secondary)',
          'text-tertiary': 'var(--text-tertiary)',
          'text-inverse': 'var(--text-inverse)',
          'text-muted': 'var(--text-muted)',
          'text-accent': 'var(--text-accent)',
          
          'border-primary': 'var(--border-primary)',
          'border-secondary': 'var(--border-secondary)',
          'border-accent': 'var(--border-accent)',
          'border-muted': 'var(--border-muted)',
          
          'interactive-primary': 'var(--interactive-primary)',
          'interactive-primary-hover': 'var(--interactive-primary-hover)',
          'interactive-secondary': 'var(--interactive-secondary)',
          'interactive-secondary-hover': 'var(--interactive-secondary-hover)',
          
          'status-success': 'var(--status-success)',
          'status-error': 'var(--status-error)',
          'status-warning': 'var(--status-warning)',
          'status-info': 'var(--status-info)',
        },
        
        // Legacy Tailwind colors for compatibility
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        emerald: {
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
          800: '#065f46',
          900: '#064e3b',
        },
        slate: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Consolas', 'Monaco', 'Courier New', 'monospace'],
      },
      animation: {
        'spin': 'spin 1s linear infinite',
      },
    },
  },
  plugins: [],
} 
export interface ThemeColors {
  // Background colors
  background: {
    primary: string
    secondary: string
    tertiary: string
    elevated: string
    surface: string
    overlay: string
  }
  
  // Text colors
  text: {
    primary: string
    secondary: string
    tertiary: string
    inverse: string
    muted: string
    accent: string
  }
  
  // Border colors
  border: {
    primary: string
    secondary: string
    accent: string
    muted: string
    focus: string
  }
  
  // Status colors
  status: {
    success: string
    error: string
    warning: string
    info: string
    neutral: string
  }
  
  // Interactive colors
  interactive: {
    primary: string
    primaryHover: string
    secondary: string
    secondaryHover: string
    tertiary: string
    tertiaryHover: string
  }
  
  // Chart/data visualization colors
  chart: {
    primary: string[]
    gradients: string[]
  }
  
  alert: {
    success: AlertTheme
    error: AlertTheme
    warning: AlertTheme
    info: AlertTheme
    neutral: AlertTheme
  }
}

export interface AlertTheme {
  background: string
  text: string
  border: string
  icon?: string // Optional: for icon color
}

export interface ThemeLayout {
  borderRadius: {
    none: string
    sm: string
    md: string
    lg: string
    xl: string
    full: string
  }
  
  spacing: {
    xs: string
    sm: string
    md: string
    lg: string
    xl: string
  }
  
  shadows: {
    sm: string
    md: string
    lg: string
    xl: string
  }
  
  typography: {
    fontFamily: {
      sans: string
      mono: string
    }
    fontSize: {
      xs: string
      sm: string
      base: string
      lg: string
      xl: string
      '2xl': string
      '3xl': string
    }
  }
}

export interface Theme {
  id: string
  name: string
  description: string
  type: 'light' | 'dark'
  colors: ThemeColors
  layout: ThemeLayout
}

// Default theme (current theme)
export const defaultTheme: Theme = {
  id: 'default',
  name: 'Default',
  description: 'Clean and modern interface with rounded corners',
  type: 'dark',
  colors: {
    background: {
      primary: '#0f172a',    // slate-900
      secondary: '#1e293b',  // slate-800
      tertiary: '#334155',   // slate-700
      elevated: '#475569',   // slate-600
      surface: '#64748b',    // slate-500
      overlay: 'rgba(0, 0, 0, 0.5)'
    },
    text: {
      primary: '#f8fafc',    // slate-50
      secondary: '#e2e8f0',  // slate-200
      tertiary: '#cbd5e1',   // slate-300
      inverse: '#0f172a',    // slate-900
      muted: '#94a3b8',      // slate-400
      accent: '#10b981'      // emerald-500
    },
    border: {
      primary: '#374151',    // gray-700
      secondary: '#4b5563',  // gray-600
      accent: '#10b981',     // emerald-500
      muted: '#6b7280',      // gray-500
      focus: '#059669'       // emerald-600
    },
    status: {
      success: '#10b981',    // emerald-500
      error: '#ef4444',      // red-500
      warning: '#f59e0b',    // amber-500
      info: '#3b82f6',       // blue-500
      neutral: '#6b7280'     // gray-500
    },
    interactive: {
      primary: '#10b981',      // emerald-500
      primaryHover: '#059669', // emerald-600
      secondary: '#374151',    // gray-700
      secondaryHover: '#4b5563', // gray-600
      tertiary: '#6b7280',     // gray-500
      tertiaryHover: '#9ca3af' // gray-400
    },
    chart: {
      primary: [
        '#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', 
        '#06b6d4', '#f97316', '#84cc16', '#ec4899', '#6366f1'
      ],
      gradients: [
        'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
        'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
      ]
    },
    alert: {
      success: {
        background: '#064e3b',
        text: '#d1fae5',
        border: '#10b981',
        icon: '#10b981'
      },
      error: {
        background: '#7f1d1d',
        text: '#fee2e2',
        border: '#ef4444',
        icon: '#ef4444'
      },
      warning: {
        background: '#78350f',
        text: '#fef3c7',
        border: '#f59e0b',
        icon: '#f59e0b'
      },
      info: {
        background: '#1e3a8a33',
        text: '#93c5fd',
        border: '#1e40af',
        icon: '#3b82f6'
      },
      neutral: {
        background: '#334155',
        text: '#f1f5f9',
        border: '#64748b',
        icon: '#64748b'
      }
    }
  },
  layout: {
    borderRadius: {
      none: '0',
      sm: '0.125rem',
      md: '0.375rem',
      lg: '0.5rem',
      xl: '0.75rem',
      full: '9999px'
    },
    spacing: {
      xs: '0.5rem',
      sm: '0.75rem',
      md: '1rem',
      lg: '1.5rem',
      xl: '2rem'
    },
    shadows: {
      sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
      md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
      xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
    },
    typography: {
      fontFamily: {
        sans: 'Inter, system-ui, -apple-system, sans-serif',
        mono: 'Fira Code, Consolas, Monaco, monospace'
      },
      fontSize: {
        xs: '0.75rem',
        sm: '0.875rem',
        base: '1rem',
        lg: '1.125rem',
        xl: '1.25rem',
        '2xl': '1.5rem',
        '3xl': '1.875rem'
      }
    }
  }
}

// Professional dark theme (formerly Grafana-inspired)
export const professionalTheme: Theme = {
  id: 'professional',
  name: 'Professional Dark',
  description: 'Modern dark theme with minimal borders and sharp edges for professional interfaces',
  type: 'dark',
  colors: {
    background: {
      primary: '#111217',    // Very dark background
      secondary: '#181b1f',  // Slightly lighter dark
      tertiary: '#1f2329',   // Card/panel background
      elevated: '#262a31',   // Elevated surfaces
      surface: '#2f3338',    // Interactive surfaces
      overlay: 'rgba(0, 0, 0, 0.8)'
    },
    text: {
      primary: '#ffffff',    // Pure white text
      secondary: '#c7d0d9',  // Light gray text
      tertiary: '#9fa7b3',   // Muted text
      inverse: '#111217',    // Dark text for light backgrounds
      muted: '#6e7681',      // Very muted text
      accent: '#00d4aa'      // Professional teal accent
    },
    border: {
      primary: '#2f3338',    // Subtle borders
      secondary: '#3c4146',  // Slightly more visible borders
      accent: '#00d4aa',     // Teal accent border
      muted: '#262a31',      // Very subtle borders
      focus: '#00d4aa'       // Focus state
    },
    status: {
      success: '#73bf69',    // Professional green
      error: '#f2495c',      // Professional red
      warning: '#ffa500',    // Professional amber
      info: '#5794f2',       // Professional blue
      neutral: '#6e7681'     // Neutral gray
    },
    interactive: {
      primary: '#00d4aa',      // Professional teal
      primaryHover: '#00c199', // Lighter teal
      secondary: '#2f3338',    // Dark button
      secondaryHover: '#3c4146', // Hover state
      tertiary: '#1f2329',     // Subtle button
      tertiaryHover: '#262a31' // Subtle hover
    },
    chart: {
      primary: [
        '#5794f2', '#73bf69', '#eab839', '#f2495c', '#b877d9',
        '#56a64b', '#f2cc0c', '#3274d9', '#00d4aa', '#962d82'
      ],
      gradients: [
        'linear-gradient(90deg, #5794f2 0%, #3274d9 100%)',
        'linear-gradient(90deg, #73bf69 0%, #56a64b 100%)',
        'linear-gradient(90deg, #00d4aa 0%, #00c199 100%)'
      ]
    },
    alert: {
      success: {
        background: '#10b98122',
        text: '#d1fae5',
        border: '#10b981',
        icon: '#10b981'
      },
      error: {
        background: '#ef444422',
        text: '#ef4444',
        border: '#ef4444',
        icon: '#ef4444'
      },
      warning: {
        background: '#f59e0b22',
        text: '#fef3c7',
        border: '#f59e0b',
        icon: '#f59e0b'
      },
      info: {
        background: '#1e3a8a33',
        text: '#93c5fd',
        border: '#1e40af',
        icon: '#3b82f6'
      },
      neutral: {
        background: '#6b728022',
        text: '#6b7280',
        border: '#6b7280',
        icon: '#6b7280'
      }
    }
  },
  layout: {
    borderRadius: {
      none: '0',
      sm: '0',
      md: '2px',
      lg: '3px',
      xl: '4px',
      full: '2px'
    },
    spacing: {
      xs: '4px',
      sm: '8px',
      md: '12px',
      lg: '16px',
      xl: '24px'
    },
    shadows: {
      sm: '0 1px 2px rgba(0, 0, 0, 0.2)',
      md: '0 4px 8px rgba(0, 0, 0, 0.3)',
      lg: '0 8px 16px rgba(0, 0, 0, 0.4)',
      xl: '0 16px 32px rgba(0, 0, 0, 0.5)'
    },
    typography: {
      fontFamily: {
        sans: 'Inter, "Helvetica Neue", Arial, sans-serif',
        mono: 'Fira Code, Monaco, "Cascadia Code", monospace'
      },
      fontSize: {
        xs: '11px',
        sm: '12px',
        base: '14px',
        lg: '16px',
        xl: '18px',
        '2xl': '20px',
        '3xl': '24px'
      }
    }
  }
}

// Light theme variant
export const lightTheme: Theme = {
  id: 'light',
  name: 'Light',
  description: 'Clean light theme for bright environments',
  type: 'light',
  colors: {
    background: {
      primary: '#ffffff',    // White
      secondary: '#f8fafc',  // slate-50
      tertiary: '#f1f5f9',   // slate-100
      elevated: '#e2e8f0',   // slate-200
      surface: '#cbd5e1',    // slate-300
      overlay: 'rgba(0, 0, 0, 0.1)'
    },
    text: {
      primary: '#0f172a',    // slate-900
      secondary: '#334155',  // slate-700
      tertiary: '#475569',   // slate-600
      inverse: '#ffffff',    // white
      muted: '#64748b',      // slate-500
      accent: '#059669'      // emerald-600
    },
    border: {
      primary: '#e2e8f0',    // slate-200
      secondary: '#cbd5e1',  // slate-300
      accent: '#059669',     // emerald-600
      muted: '#f1f5f9',      // slate-100
      focus: '#10b981'       // emerald-500
    },
    status: {
      success: '#059669',    // emerald-600
      error: '#dc2626',      // red-600
      warning: '#d97706',    // amber-600
      info: '#2563eb',       // blue-600
      neutral: '#64748b'     // slate-500
    },
    interactive: {
      primary: '#059669',      // emerald-600
      primaryHover: '#047857', // emerald-700
      secondary: '#e2e8f0',    // slate-200
      secondaryHover: '#cbd5e1', // slate-300
      tertiary: '#f1f5f9',     // slate-100
      tertiaryHover: '#e2e8f0' // slate-200
    },
    chart: {
      primary: [
        '#059669', '#2563eb', '#d97706', '#dc2626', '#7c3aed',
        '#0891b2', '#ea580c', '#65a30d', '#db2777', '#4f46e5'
      ],
      gradients: [
        'linear-gradient(135deg, #059669 0%, #047857 100%)',
        'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
        'linear-gradient(135deg, #d97706 0%, #b45309 100%)'
      ]
    },
    alert: {
      success: {
        background: '#064e3b',
        text: '#d1fae5',
        border: '#10b981',
        icon: '#10b981'
      },
      error: {
        background: '#7f1d1d',
        text: '#fee2e2',
        border: '#ef4444',
        icon: '#ef4444'
      },
      warning: {
        background: '#78350f',
        text: '#fef3c7',
        border: '#f59e0b',
        icon: '#f59e0b'
      },
      info: {
        background: '#1e3a8a33',
        text: '#93c5fd',
        border: '#1e40af',
        icon: '#3b82f6'
      },
      neutral: {
        background: '#334155',
        text: '#f1f5f9',
        border: '#64748b',
        icon: '#64748b'
      }
    }
  },
  layout: {
    borderRadius: {
      none: '0',
      sm: '0.125rem',
      md: '0.375rem',
      lg: '0.5rem',
      xl: '0.75rem',
      full: '9999px'
    },
    spacing: {
      xs: '0.5rem',
      sm: '0.75rem',
      md: '1rem',
      lg: '1.5rem',
      xl: '2rem'
    },
    shadows: {
      sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
      md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
      xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
    },
    typography: {
      fontFamily: {
        sans: 'Inter, system-ui, -apple-system, sans-serif',
        mono: 'Fira Code, Consolas, Monaco, monospace'
      },
      fontSize: {
        xs: '0.75rem',
        sm: '0.875rem',
        base: '1rem',
        lg: '1.125rem',
        xl: '1.25rem',
        '2xl': '1.5rem',
        '3xl': '1.875rem'
      }
    }
  }
}

export const themes: Theme[] = [
  professionalTheme,  // Make professional the first/default option
  defaultTheme,
  lightTheme
]

export const getThemeById = (id: string): Theme => {
  return themes.find(theme => theme.id === id) || professionalTheme  // Default to professional theme
}

export const getThemeVars = (theme: Theme): Record<string, string> => {
  return {
    // Background
    '--bg-primary': theme.colors.background.primary,
    '--bg-secondary': theme.colors.background.secondary,
    '--bg-tertiary': theme.colors.background.tertiary,
    '--bg-elevated': theme.colors.background.elevated,
    '--bg-surface': theme.colors.background.surface,
    '--bg-overlay': theme.colors.background.overlay,
    
    // Text
    '--text-primary': theme.colors.text.primary,
    '--text-secondary': theme.colors.text.secondary,
    '--text-tertiary': theme.colors.text.tertiary,
    '--text-inverse': theme.colors.text.inverse,
    '--text-muted': theme.colors.text.muted,
    '--text-accent': theme.colors.text.accent,
    
    // Borders
    '--border-primary': theme.colors.border.primary,
    '--border-secondary': theme.colors.border.secondary,
    '--border-accent': theme.colors.border.accent,
    '--border-muted': theme.colors.border.muted,
    '--border-focus': theme.colors.border.focus,
    
    // Status
    '--status-success': theme.colors.status.success,
    '--status-error': theme.colors.status.error,
    '--status-warning': theme.colors.status.warning,
    '--status-info': theme.colors.status.info,
    '--status-neutral': theme.colors.status.neutral,
    
    // Interactive
    '--interactive-primary': theme.colors.interactive.primary,
    '--interactive-primary-hover': theme.colors.interactive.primaryHover,
    '--interactive-secondary': theme.colors.interactive.secondary,
    '--interactive-secondary-hover': theme.colors.interactive.secondaryHover,
    '--interactive-tertiary': theme.colors.interactive.tertiary,
    '--interactive-tertiary-hover': theme.colors.interactive.tertiaryHover,
    
    // Border Radius
    '--radius-none': theme.layout.borderRadius.none,
    '--radius-sm': theme.layout.borderRadius.sm,
    '--radius-md': theme.layout.borderRadius.md,
    '--radius-lg': theme.layout.borderRadius.lg,
    '--radius-xl': theme.layout.borderRadius.xl,
    '--radius-full': theme.layout.borderRadius.full,
    
    // Spacing
    '--spacing-xs': theme.layout.spacing.xs,
    '--spacing-sm': theme.layout.spacing.sm,
    '--spacing-md': theme.layout.spacing.md,
    '--spacing-lg': theme.layout.spacing.lg,
    '--spacing-xl': theme.layout.spacing.xl,
    
    // Typography
    '--font-sans': theme.layout.typography.fontFamily.sans,
    '--font-mono': theme.layout.typography.fontFamily.mono,
    '--text-xs': theme.layout.typography.fontSize.xs,
    '--text-sm': theme.layout.typography.fontSize.sm,
    '--text-base': theme.layout.typography.fontSize.base,
    '--text-lg': theme.layout.typography.fontSize.lg,
    '--text-xl': theme.layout.typography.fontSize.xl,
    '--text-2xl': theme.layout.typography.fontSize['2xl'],
    '--text-3xl': theme.layout.typography.fontSize['3xl'],
    
    // Shadows
    '--shadow-sm': theme.layout.shadows.sm,
    '--shadow-md': theme.layout.shadows.md,
    '--shadow-lg': theme.layout.shadows.lg,
    '--shadow-xl': theme.layout.shadows.xl,
    
    // Alerts
    '--alert-success-bg': theme.colors.alert.success.background,
    '--alert-success-text': theme.colors.alert.success.text,
    '--alert-success-border': theme.colors.alert.success.border,
    '--alert-error-bg': theme.colors.alert.error.background,
    '--alert-error-text': theme.colors.alert.error.text,
    '--alert-error-border': theme.colors.alert.error.border,
    '--alert-warning-bg': theme.colors.alert.warning.background,
    '--alert-warning-text': theme.colors.alert.warning.text,
    '--alert-warning-border': theme.colors.alert.warning.border,
    '--alert-info-bg': theme.colors.alert.info.background,
    '--alert-info-text': theme.colors.alert.info.text,
    '--alert-info-border': theme.colors.alert.info.border,
    '--alert-neutral-bg': theme.colors.alert.neutral.background,
    '--alert-neutral-text': theme.colors.alert.neutral.text,
    '--alert-neutral-border': theme.colors.alert.neutral.border
  }
} 
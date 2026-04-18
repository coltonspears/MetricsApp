# MetricsApp Theming System

A comprehensive theming system inspired by modern design systems like Grafana, providing multiple predefined themes with support for custom themes.

## 🎨 Overview

The MetricsApp theming system provides:

- **Multiple Predefined Themes**: Grafana-inspired dark theme, Default theme, and Light theme
- **CSS Variables Architecture**: Dynamic theme switching using CSS custom properties
- **Type-Safe Theme Definitions**: Fully typed TypeScript theme objects
- **Responsive Design**: Themes work seamlessly across all device sizes
- **Accessibility**: Proper contrast ratios and reduced motion support
- **Developer Experience**: Easy theme customization and extension

## 🌟 Available Themes

### 1. **Grafana Theme** (Recommended)
- **ID**: `grafana`
- **Style**: Dark, professional, minimal rounded corners
- **Use Case**: Professional dashboards and analytics interfaces
- **Colors**: Deep dark backgrounds with high contrast
- **Typography**: Inter font with enhanced readability
- **Borders**: Minimal rounding (2px max) for clean, modern look

### 2. **Default Theme**
- **ID**: `default`
- **Style**: Balanced dark theme with moderate rounding
- **Use Case**: General purpose applications
- **Colors**: Slate-based color palette
- **Typography**: System fonts with good readability
- **Borders**: Medium rounding for friendly appearance

### 3. **Light Theme**
- **ID**: `light`
- **Style**: Clean light theme for bright environments
- **Use Case**: Daytime usage, accessibility needs
- **Colors**: Light backgrounds with dark text
- **Typography**: High contrast for readability
- **Borders**: Consistent with other themes

## 🚀 Quick Start

### Using the Theme Selector

1. **In the Sidebar**: Click the theme selector in the sidebar footer
2. **In the Top Navigation**: Use the compact theme selector in the top bar
3. **In Profile Menu**: Access full theme options in the profile dropdown
4. **Theme Showcase**: Visit `/themes` to compare all themes

### Programmatic Theme Switching

```tsx
import { useTheme } from '../lib/theme'

function MyComponent() {
  const { currentTheme, setTheme, availableThemes } = useTheme()
  
  return (
    <div>
      <h2>{currentTheme.name}</h2>
      <select 
        value={currentTheme.id} 
        onChange={(e) => setTheme(e.target.value)}
      >
        {availableThemes.map(theme => (
          <option key={theme.id} value={theme.id}>
            {theme.name}
          </option>
        ))}
      </select>
    </div>
  )
}
```

## 🎯 Using CSS Variables

All themes provide consistent CSS variables that you can use in your components:

### Background Colors
```css
background-color: var(--bg-primary);     /* Main background */
background-color: var(--bg-secondary);   /* Sidebar, nav bars */
background-color: var(--bg-tertiary);    /* Cards, panels */
background-color: var(--bg-elevated);    /* Modals, dropdowns */
background-color: var(--bg-surface);     /* Input fields */
```

### Text Colors
```css
color: var(--text-primary);    /* Main text */
color: var(--text-secondary);  /* Supporting text */
color: var(--text-muted);      /* Subtle text */
color: var(--text-accent);     /* Accent/highlight text */
color: var(--text-inverse);    /* Text on colored backgrounds */
```

### Interactive Elements
```css
background-color: var(--interactive-primary);        /* Primary buttons */
background-color: var(--interactive-primary-hover);  /* Primary hover */
background-color: var(--interactive-secondary);      /* Secondary buttons */
border-color: var(--border-primary);                 /* Default borders */
```

### Status Colors
```css
color: var(--status-success);  /* Success states */
color: var(--status-error);    /* Error states */
color: var(--status-warning);  /* Warning states */
color: var(--status-info);     /* Info states */
```

### Layout Properties
```css
border-radius: var(--radius-sm);    /* Small radius (2px in Grafana theme) */
border-radius: var(--radius-md);    /* Medium radius (4px in Grafana theme) */
border-radius: var(--radius-lg);    /* Large radius (6px in Grafana theme) */
font-family: var(--font-sans);      /* Primary font family */
font-family: var(--font-mono);      /* Monospace font */
```

## 🛠 Creating Custom Themes

### 1. Define Your Theme

```typescript
import { Theme } from '../lib/themes'

export const myCustomTheme: Theme = {
  id: 'custom',
  name: 'Custom Theme',
  description: 'My custom theme description',
  type: 'dark', // or 'light'
  colors: {
    background: {
      primary: '#0a0a0a',
      secondary: '#1a1a1a',
      tertiary: '#2a2a2a',
      elevated: '#3a3a3a',
      surface: '#4a4a4a',
      overlay: 'rgba(0, 0, 0, 0.8)'
    },
    text: {
      primary: '#ffffff',
      secondary: '#cccccc',
      tertiary: '#999999',
      inverse: '#000000',
      muted: '#666666',
      accent: '#00ff00'
    },
    // ... continue with other color categories
  },
  layout: {
    borderRadius: {
      none: '0',
      sm: '2px',
      md: '4px',
      lg: '8px',
      xl: '12px',
      full: '9999px'
    },
    // ... continue with typography, spacing, etc.
  }
}
```

### 2. Register Your Theme

```typescript
// In themes.ts
export const themes: Theme[] = [
  grafanaTheme,
  defaultTheme,
  lightTheme,
  myCustomTheme // Add your theme here
]
```

## 🎨 Style Inline with CSS Variables

For React components, you can use CSS variables directly in style props:

```tsx
<div
  style={{
    backgroundColor: 'var(--bg-tertiary)',
    color: 'var(--text-primary)',
    border: '1px solid var(--border-primary)',
    borderRadius: 'var(--radius-md)',
    padding: 'var(--spacing-md)'
  }}
>
  Themed content
</div>
```

## 🎛 Theme-Aware Components

### Using the Theme Context

```tsx
import { useTheme } from '../lib/theme'

function ThemedButton({ children, variant = 'primary' }) {
  const { currentTheme } = useTheme()
  
  const styles = {
    primary: {
      backgroundColor: 'var(--interactive-primary)',
      color: 'var(--text-inverse)',
      borderRadius: currentTheme.layout.borderRadius.md
    },
    secondary: {
      backgroundColor: 'var(--interactive-secondary)',
      color: 'var(--text-primary)',
      border: '1px solid var(--border-primary)',
      borderRadius: currentTheme.layout.borderRadius.md
    }
  }
  
  return (
    <button style={styles[variant]}>
      {children}
    </button>
  )
}
```

### Using CSS Classes

The theme system provides utility classes:

```tsx
<div className="themed-bg-tertiary themed-text-primary themed-radius-md">
  Content with theme classes
</div>
```

## 📱 Responsive Theming

Themes automatically work across all screen sizes. The Layout component adapts the theme selector based on screen size:

- **Desktop**: Full dropdown with labels
- **Mobile**: Compact icon-only selector
- **Sidebar**: Minimal selector when collapsed

## ♿ Accessibility

### High Contrast
All themes maintain WCAG 2.1 AA contrast ratios:
- Text on background: minimum 4.5:1
- Large text: minimum 3:1
- Interactive elements: minimum 3:1

### Reduced Motion
Themes respect `prefers-reduced-motion`:

```css
@media (prefers-reduced-motion: reduce) {
  * {
    transition: none !important;
    animation: none !important;
  }
}
```

### Focus Indicators
Clear focus indicators using theme colors:

```css
.themed-focus {
  outline: 2px solid var(--border-focus);
  outline-offset: 2px;
}
```

## 🔧 Advanced Customization

### Theme Variants
Create theme variants by extending existing themes:

```typescript
const grafanaDarkBlue: Theme = {
  ...grafanaTheme,
  id: 'grafana-blue',
  name: 'Grafana Blue',
  colors: {
    ...grafanaTheme.colors,
    interactive: {
      ...grafanaTheme.colors.interactive,
      primary: '#1f77b4',
      primaryHover: '#1a6fa0'
    }
  }
}
```

### Dynamic Theme Switching
Themes persist in localStorage and apply on page load:

```typescript
// Theme automatically loads from localStorage
// No additional setup required
```

### Custom CSS Integration
Extend themes with custom CSS:

```css
/* Custom component styles using theme variables */
.my-custom-component {
  background: linear-gradient(
    135deg, 
    var(--bg-secondary) 0%, 
    var(--bg-tertiary) 100%
  );
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
}
```

## 🔍 Theme Showcase

Visit `/themes` in your application to:

- Preview all available themes side by side
- See theme color palettes
- Test UI components in different themes
- View typography and spacing examples
- Compare theme characteristics

## 📊 Performance

### CSS Variables
- **Render Performance**: CSS variables enable instant theme switching without re-renders
- **Bundle Size**: No JavaScript color calculations, minimal overhead
- **Caching**: Themes cached in localStorage for fast loading

### Best Practices
1. Use CSS variables instead of inline calculations
2. Prefer theme CSS classes over style props when possible
3. Minimize theme context re-renders by using stable references

## 🐛 Troubleshooting

### Theme Not Applied
1. Check if `ThemeProvider` wraps your app
2. Verify CSS imports in `index.css`
3. Ensure CSS variables are used correctly

### Colors Not Updating
1. Clear localStorage: `localStorage.removeItem('metricsapp-theme')`
2. Hard refresh the page
3. Check browser developer tools for CSS variable values

### Type Errors
1. Ensure TypeScript is using the latest theme types
2. Restart TypeScript server in your IDE
3. Check imports from `../lib/theme`

## 📚 Examples

See the Theme Showcase page (`/themes`) for comprehensive examples of:
- Navigation components
- Buttons and forms
- Data visualization
- Cards and panels
- Typography
- Color palettes

---

**Happy Theming!** 🎨

For more advanced theming needs or questions, refer to the source code in `src/lib/themes.ts` and `src/components/ThemeSelector.tsx`. 
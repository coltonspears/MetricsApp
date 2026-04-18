# MetricsApp Styling Guide

## 1. Design Philosophy

MetricsApp follows a **Grafana-inspired flat design** approach:
- **Minimal borders** - subtle dividers rather than heavy outlines
- **Sharp edges** - small border-radius values (`2-4px`)
- **Dense UI** - compact spacing for information-rich displays
- **Flat appearance** - no heavy shadows or depth effects
- **Semantic colors** - status colors for meaning, accent for interaction

---

## 2. Theme System Overview

Themes are managed via React context and CSS variables, allowing for dynamic switching.

- **Theme context:** `ThemeProvider` in `src/lib/theme.tsx`
- **Theme definitions:** `src/lib/themes.ts`
- **CSS utilities:** `src/styles/themes.css`

### Available Themes

| Theme | Description |
|-------|-------------|
| **Professional Dark** | Default. Grafana-inspired with teal accent |
| **Default** | Emerald accent with rounded corners |
| **Light** | Clean light theme for bright environments |

---

## 3. Page Structure

### Page Shell
The container for all page content. Provides consistent spacing.

```tsx
<div className="page-shell">
  <PageHeader title="Page Title" description="Description" />
  {/* Page content */}
</div>
```

### Page Header
Use the `PageHeader` component for consistent page headers:

```tsx
<PageHeader
  title="Dashboard"
  description="Overview of your metrics"
  meta={<span className="badge-muted">Last updated: 5m ago</span>}
  actions={
    <button className="btn-themed-primary">Action</button>
  }
/>
```

### Page Toolbar
Horizontal filter/action bar for pages with controls:

```tsx
<div className="page-toolbar">
  <div className="page-toolbar__group">
    <select className="input-themed">...</select>
    <input className="input-themed" />
  </div>
  <div className="page-toolbar__divider" />
  <div className="page-toolbar__group">
    <button className="btn-themed-primary">Search</button>
  </div>
</div>
```

---

## 4. Panel Components

### Basic Panel
Card-like containers for content sections:

```tsx
<div className="panel">
  <div className="panel-header">
    <h3 className="panel-title">Panel Title</h3>
    <span className="badge-muted">Info</span>
  </div>
  {/* Panel content */}
  <div className="panel-footer">
    Footer text
  </div>
</div>
```

### Panel Grid
Responsive grid layouts for panels:

```tsx
<div className="panel-grid panel-grid--cols-2">
  <div className="panel">...</div>
  <div className="panel">...</div>
</div>
```

### Stat Cards
For displaying KPIs and metrics:

```tsx
<div className="stat-card">
  <div className="stat-card__label">Active Users</div>
  <div className="stat-card__value">1,234</div>
  <div className="stat-card__meta">+12% from last week</div>
</div>
```

---

## 5. Button System

### Button Variants

| Class | Usage |
|-------|-------|
| `btn-themed-primary` | Primary actions |
| `btn-themed-secondary` | Secondary actions |
| `btn-themed-danger` | Destructive actions |
| `btn-themed-outline` | Alternative primary |
| `btn-themed-ghost` | Subtle actions |

### Button Sizes
- `btn-themed-sm` - Small buttons
- Default - Standard size
- `btn-themed-lg` - Large buttons

### Usage

```tsx
<button className="btn-themed-primary">
  <Icon className="h-4 w-4" />
  Button Text
</button>

<button className="btn-themed-secondary btn-themed-sm">
  Small Secondary
</button>
```

---

## 6. Form Controls

### Input Fields

```tsx
<input type="text" className="input-themed" placeholder="Enter text..." />
<select className="input-themed">
  <option>Option 1</option>
</select>
<textarea className="input-themed" rows={3} />
```

---

## 7. Tab Navigation

```tsx
<div className="tab-nav">
  <button className="tab-nav__item tab-nav__item--active">Active Tab</button>
  <button className="tab-nav__item">Tab 2</button>
  <button className="tab-nav__item">Tab 3</button>
</div>
```

---

## 8. Tables

```tsx
<table className="table-themed">
  <thead>
    <tr>
      <th>Column 1</th>
      <th>Column 2</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Value 1</td>
      <td>Value 2</td>
    </tr>
  </tbody>
</table>
```

---

## 9. Badges & Status

### Badge
Compact tags for metadata:

```tsx
<span className="badge-muted">
  <Icon className="h-3 w-3" />
  Label
</span>
```

### Status Colors
Use CSS variables for semantic status:

```tsx
<span style={{ color: 'var(--status-success)' }}>Success</span>
<span style={{ color: 'var(--status-error)' }}>Error</span>
<span style={{ color: 'var(--status-warning)' }}>Warning</span>
<span style={{ color: 'var(--status-info)' }}>Info</span>
```

---

## 10. Alerts

```tsx
<div 
  className="p-3 text-sm"
  style={{ 
    backgroundColor: 'var(--alert-info-bg)', 
    color: 'var(--alert-info-text)',
    borderLeft: '3px solid var(--alert-info-border)',
    borderRadius: 'var(--radius-sm)'
  }}
>
  <strong>Info:</strong> Alert message here.
</div>
```

---

## 11. CSS Variables Reference

### Backgrounds
| Variable | Description |
|----------|-------------|
| `--bg-primary` | Main page background |
| `--bg-secondary` | Panel backgrounds |
| `--bg-tertiary` | Nested elements, cards |
| `--bg-elevated` | Elevated surfaces |
| `--bg-surface` | Interactive surfaces |

### Text
| Variable | Description |
|----------|-------------|
| `--text-primary` | Main text |
| `--text-secondary` | Supporting text |
| `--text-tertiary` | De-emphasized text |
| `--text-muted` | Very subtle text |
| `--text-accent` | Highlighted/code text |
| `--text-inverse` | Text on colored backgrounds |

### Interactive
| Variable | Description |
|----------|-------------|
| `--interactive-primary` | Primary action color |
| `--interactive-primary-hover` | Primary hover state |
| `--interactive-secondary` | Secondary backgrounds |
| `--interactive-secondary-hover` | Secondary hover state |

### Status
| Variable | Description |
|----------|-------------|
| `--status-success` | Success/positive |
| `--status-error` | Error/negative |
| `--status-warning` | Warning/caution |
| `--status-info` | Informational |
| `--status-neutral` | Neutral/default |

### Layout
| Variable | Description |
|----------|-------------|
| `--radius-sm` | Small radius (2px) |
| `--radius-md` | Medium radius |
| `--radius-lg` | Large radius |
| `--spacing-xs` | Extra small (4px) |
| `--spacing-sm` | Small (8px) |
| `--spacing-md` | Medium (12px) |
| `--spacing-lg` | Large (16px) |
| `--spacing-xl` | Extra large (24px) |

### Typography
| Variable | Description |
|----------|-------------|
| `--font-sans` | Primary font family |
| `--font-mono` | Monospace font |
| `--text-xs` | 11px |
| `--text-sm` | 12px |
| `--text-base` | 14px |
| `--text-lg` | 16px |
| `--text-xl` | 18px |

---

## 12. Best Practices

### DO
- ✅ Use CSS variables for all colors and spacing
- ✅ Use provided utility classes (`btn-themed-*`, `input-themed`, etc.)
- ✅ Keep buttons compact with icons
- ✅ Use `panel` for content sections
- ✅ Use semantic status colors

### DON'T
- ❌ Hardcode color values
- ❌ Use heavy shadows or 3D effects
- ❌ Use large border-radius values
- ❌ Create custom button styles (use the system)
- ❌ Mix Tailwind color classes with theme variables

---

## 13. Resources

- **Theme definitions:** `src/lib/themes.ts`
- **Theme context:** `src/lib/theme.tsx`
- **CSS utilities:** `src/styles/themes.css`
- **Style Guide page:** `/docs/styleguide`
- **Theme Showcase:** `/docs/themeshowcase`

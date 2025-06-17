# MetricsApp Styling Guide

## 1. Theme System Overview

MetricsApp uses a flexible theme system defined in TypeScript and CSS. Themes are managed via React context and CSS variables, allowing for dynamic switching and easy extension.

- **Theme context:** Provided by `ThemeProvider` (`src/lib/theme.tsx`).
- **Theme definitions:** In `src/lib/themes.ts`.
- **CSS variables:** Set in `src/styles/themes.css` and dynamically updated via JS.

---

## 2. Theme Structure

Each theme is an object with the following structure:

```ts
interface Theme {
  id: string
  name: string
  description: string
  type: 'light' | 'dark'
  colors: ThemeColors
  layout: ThemeLayout
}
```

### 2.1. Colors

- **Backgrounds:** `primary`, `secondary`, `tertiary`, `elevated`, `surface`, `overlay`
- **Text:** `primary`, `secondary`, `tertiary`, `inverse`, `muted`, `accent`
- **Borders:** `primary`, `secondary`, `accent`, `muted`, `focus`
- **Status:** `success`, `error`, `warning`, `info`, `neutral`
- **Interactive:** `primary`, `primaryHover`, `secondary`, `secondaryHover`, `tertiary`, `tertiaryHover`
- **Chart:** `primary[]`, `gradients[]`
- **Alert:** `success`, `error`, `warning`, `info`, `neutral` (each with `background`, `text`, `border`, `icon`)

### 2.2. Layout

- **Border radius:** `none`, `sm`, `md`, `lg`, `xl`, `full`
- **Spacing:** `xs`, `sm`, `md`, `lg`, `xl`
- **Shadows:** `sm`, `md`, `lg`, `xl`
- **Typography:** `fontFamily` (`sans`, `mono`), `fontSize` (`xs`, `sm`, `base`, `lg`, `xl`, `2xl`, `3xl`)

---

## 3. Using Theme Variables

All theme values are mapped to CSS variables (e.g., `--bg-primary`, `--text-primary`). These are set on the `:root` and updated dynamically.

**Example:**
```css
body {
  background-color: var(--bg-primary);
  color: var(--text-primary);
}
```

**Utility classes** are provided in `themes.css` for quick usage:
- `.themed-bg-primary`, `.themed-text-secondary`, `.themed-border-accent`, etc.

---

## 4. Theme Switching

- Use the `ThemeProvider` at the root of your app.
- Access theme and switcher via the `useTheme()` hook.
- Use the `<ThemeSelector />` component for a UI theme switcher.

**Example:**
```tsx
const { currentTheme, setTheme, toggleTheme } = useTheme()
```

---

## 5. Component Styling Best Practices

- **Always use CSS variables** for colors, spacing, and typography.
- **Do not hardcode colors** or font sizes in components.
- Use utility classes or inline styles referencing CSS variables.

**Example:**
```tsx
<div style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}>
  Themed content
</div>
```

---

## 6. Customizing and Extending Themes

- Add new themes in `src/lib/themes.ts` and include them in the `themes` array.
- Ensure all required color and layout tokens are provided.
- Add new CSS variables in `getThemeVars()` if you introduce new tokens.

---

## 7. Alerts, Status, and Special Elements

- Use alert variables for backgrounds, borders, and icons:
  - `--alert-success-bg`, `--alert-error-border`, etc.
- Status colors: `--status-success`, `--status-error`, etc.

---

## 8. Typography

- Use `var(--font-sans)` and `var(--font-mono)` for font families.
- Use `var(--text-xs)`, `var(--text-base)`, etc., for font sizes.

---

## 9. Example: Themed Button

```tsx
<button
  className="btn-themed-primary"
  style={{
    backgroundColor: 'var(--interactive-primary)',
    color: 'var(--text-inverse)',
    borderRadius: 'var(--radius-md)'
  }}
>
  Themed Button
</button>
```

Or use the provided utility class:
```html
<button class="btn-themed-primary">Themed Button</button>
```

---

## 10. Accessibility & Transitions

- All transitions respect user `prefers-reduced-motion`.
- Focus states use `--border-focus` for accessibility.

---

## 11. Adding New Themed Components

1. Use CSS variables for all colors, spacing, and typography.
2. Add utility classes if a pattern is reused.
3. Test in all available themes using the ThemeShowcase or StyleGuide page.

---

## 12. Resources

- **Theme definitions:** `src/lib/themes.ts`
- **Theme context/provider:** `src/lib/theme.tsx`
- **CSS variables/utilities:** `src/styles/themes.css`
- **Theme selector UI:** `src/components/ThemeSelector.tsx`
- **Showcase/demo:** `src/pages/ThemeShowcase.tsx`
- **Visual style guide:** `src/pages/StyleGuide.tsx`

---

## 13. Quick Reference: Common CSS Variables

| Token                  | CSS Variable                | Example Value      |
|------------------------|----------------------------|--------------------|
| Background Primary     | `--bg-primary`             | `#0f172a`          |
| Text Primary           | `--text-primary`           | `#f8fafc`          |
| Border Accent          | `--border-accent`          | `#10b981`          |
| Status Success         | `--status-success`         | `#10b981`          |
| Interactive Primary    | `--interactive-primary`    | `#10b981`          |
| Font Sans              | `--font-sans`              | `Inter, ...`       |
| Font Size Base         | `--text-base`              | `1rem`             |
| Radius MD              | `--radius-md`              | `0.375rem`         |

---

## 14. Visual Reference

See the `/StyleGuide` page in the app for a live, interactive reference of all tokens and components. 
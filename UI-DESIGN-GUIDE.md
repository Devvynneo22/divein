# DiveIn UI Design Guide

## Design Principles (Notion-inspired)

1. **Generous spacing** — 8px grid system. Padding: pages get `px-8 py-8`. Cards get `p-5` or `p-6`. Items get `py-2.5` or `py-3`.
2. **Bigger typography** — Page titles: `text-2xl` or `text-3xl font-bold`. Section headers: `text-base font-semibold`. Body text: `text-sm` (14px). Never use `text-xs` for primary content.
3. **Theme-aware colors** — ALL colors must use CSS custom properties via inline `style={{ color: 'var(--color-*)' }}` or the utility classes. NEVER use hardcoded hex colors or Tailwind color classes like `text-blue-500`. The app supports light AND dark themes.
4. **Cards** — Use the `.card` CSS class for card containers (adds bg, border, border-radius, shadow). Interactive cards also get `.card-interactive`.
5. **Inputs** — Use `.input-base` class for text inputs. 
6. **Hover states** — Use inline onMouseEnter/onMouseLeave with CSS variables, e.g. `var(--color-bg-hover)`.
7. **Rounded corners** — `rounded-lg` (8px) for cards/inputs, `rounded-xl` (12px) for large elements, `rounded-full` for pills/badges.
8. **Shadows** — Cards use `var(--shadow-sm)` by default, `var(--shadow-md)` on hover.

## Color Variables Available

### Backgrounds
- `--color-bg-primary` — main page background
- `--color-bg-secondary` — sidebar, secondary panels  
- `--color-bg-tertiary` — input backgrounds, badges
- `--color-bg-elevated` — cards, modals, popovers
- `--color-bg-hover` — hover state for interactive items
- `--color-bg-active` — active/pressed state
- `--color-bg-wash` — very subtle wash backgrounds

### Text
- `--color-text-primary` — headings, main text
- `--color-text-secondary` — body text, descriptions
- `--color-text-muted` — placeholders, hints, metadata

### Borders
- `--color-border` — default borders
- `--color-border-hover` — hover border state
- `--color-border-strong` — emphasized borders

### Semantic
- `--color-accent` / `--color-accent-hover` — primary action color
- `--color-accent-soft` — subtle accent background (8% opacity)
- `--color-accent-muted` — medium accent background (15% opacity)
- `--color-danger` / `--color-success` / `--color-warning` — status colors
- `--color-danger-soft` / `--color-success-soft` / `--color-warning-soft` — soft status backgrounds

### Priority Colors
- `--color-p1` through `--color-p4`

## Pattern: Theme-Aware Component

```tsx
// ✅ CORRECT — uses CSS variables
<div 
  className="rounded-lg p-5"
  style={{ 
    backgroundColor: 'var(--color-bg-elevated)', 
    border: '1px solid var(--color-border)' 
  }}
>
  <h2 style={{ color: 'var(--color-text-primary)' }}>Title</h2>
  <p style={{ color: 'var(--color-text-secondary)' }}>Description</p>
</div>

// ❌ WRONG — hardcoded dark theme colors
<div className="bg-[#18181b] border-[#2e2e33]">
  <h2 className="text-white">Title</h2>
</div>

// ❌ WRONG — Tailwind color classes
<div className="bg-zinc-900 border-zinc-700">
  <h2 className="text-zinc-100">Title</h2>
</div>
```

## Pattern: Hover States

```tsx
// ✅ CORRECT
<button
  style={{ color: 'var(--color-text-secondary)' }}
  onMouseEnter={(e) => {
    e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)';
    e.currentTarget.style.color = 'var(--color-text-primary)';
  }}
  onMouseLeave={(e) => {
    e.currentTarget.style.backgroundColor = 'transparent';
    e.currentTarget.style.color = 'var(--color-text-secondary)';
  }}
>

// Also acceptable: Tailwind hover: classes with CSS variable values
<button className="hover:bg-[var(--color-bg-hover)]">
```

## Key Layout Guidelines

1. **Page padding**: `px-8 py-8` (32px all around)
2. **Max content width**: `max-w-5xl mx-auto` for dashboard/settings. Full width for tasks/notes/calendar.
3. **Section gaps**: `gap-6` between major sections, `gap-4` between cards in a grid
4. **Item spacing in lists**: `space-y-1` with `py-2.5` on each item
5. **Sidebar**: Already overhauled. Don't touch `Sidebar.tsx`, `Layout.tsx`, or `StatusBar.tsx`.
6. **No `bg-[var(--color-*)]` syntax** — Tailwind 4 handles this differently. Use inline `style` for CSS variables.

## Files NOT to modify
- `src/styles/globals.css`
- `src/app/Sidebar.tsx`
- `src/app/Layout.tsx` 
- `src/app/StatusBar.tsx`
- `src/app/App.tsx`
- `src/modules/dashboard/DashboardPage.tsx`
- `src/shared/stores/appSettingsStore.ts`
- Any files in `src/shared/lib/` (services)
- Any files in `src/shared/types/` (types)
- Any files in `src/shared/stores/` (stores)

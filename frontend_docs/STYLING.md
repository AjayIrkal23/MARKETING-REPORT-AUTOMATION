# Frontend Styling & Design Tokens

Tailwind v4 token system, style layer ownership, and token discipline for the JSW Marketing Report Automation frontend. Governed by the `tailwind-design-system` and `frontend-ui-engineering` skills.

---

## Tailwind v4 (`@tailwindcss/vite`, no `tailwind.config.js`)

This project uses Tailwind CSS v4. The integration is through the Vite plugin — there is **no `tailwind.config.js`**; that is a v3 pattern and must not be created.

| Fact | Detail |
|------|--------|
| Plugin | `@tailwindcss/vite` (declared in `vite.config.ts`) |
| Entry point | `src/index.css` — first line is `@import "tailwindcss";` |
| Theme extension | Done inside `@theme inline { … }` blocks in `index.css`, not in a config file |
| shadcn wiring | `components.json` → `tailwind.css = "src/index.css"`, `cssVariables: true`, prefix `""` |
| Animation | `tw-animate-css` imported on line 2 of `index.css` |
| Fonts | `@fontsource-variable/geist` — mapped to `--font-sans` and `--font-heading` in `@theme inline` |

**v3 → v4 migration rules that apply here:**
- Do not write `theme: { extend: { … } }` anywhere — extend tokens via `@theme inline` in CSS.
- Do not use `tailwind.config.cjs`. The build fails silently if both exist.
- Arbitrary values (`text-[13px]`) are allowed but banned if a scale token exists.

---

## Design Tokens (`index.css` — shadcn oklch, `:root` / `.dark`)

All tokens are defined as CSS custom properties in `src/index.css` and re-exported into Tailwind's `@theme inline` block so utility classes (`bg-primary`, `text-foreground`, etc.) resolve to them.

### Semantic token table (light / dark)

| CSS var | Light | Dark | Role |
|---------|-------|------|------|
| `--background` | `oklch(0.99 0.004 256)` | `oklch(0.17 0.02 258)` | Page background |
| `--foreground` | `oklch(0.18 0.02 258)` | `oklch(0.97 0.008 256)` | Body text |
| `--card` | `oklch(1 0 0)` | `oklch(0.21 0.025 258)` | Card surface |
| `--card-foreground` | same as foreground | same as foreground | Card text |
| `--primary` | `oklch(0.45 0.16 256)` | `oklch(0.62 0.17 256)` | Brand action / CTA |
| `--primary-foreground` | `oklch(0.99 0.005 256)` | `oklch(0.16 0.02 258)` | Text on primary |
| `--secondary` | `oklch(0.96 0.012 256)` | `oklch(0.27 0.03 258)` | Secondary surface |
| `--muted` | `oklch(0.96 0.008 256)` | `oklch(0.27 0.03 258)` | Muted surface |
| `--muted-foreground` | `oklch(0.5 0.025 257)` | `oklch(0.72 0.02 256)` | Secondary text |
| `--accent` | `oklch(0.93 0.03 256)` | `oklch(0.3 0.05 257)` | Hover / accent tint |
| `--destructive` | `oklch(0.56 0.24 26)` | `oklch(0.64 0.22 26)` | Error / delete |
| `--border` | `oklch(0.9 0.012 256)` | `oklch(1 0 0 / 12%)` | Default border |
| `--input` | `oklch(0.9 0.012 256)` | `oklch(1 0 0 / 16%)` | Form input border |
| `--ring` | `oklch(0.45 0.16 256)` | `oklch(0.62 0.17 256)` | Focus ring |
| `--radius` | `0.625rem` | same | Base border radius |

**Sidebar tokens** (`--sidebar`, `--sidebar-foreground`, `--sidebar-primary`, `--sidebar-accent`, `--sidebar-border`, `--sidebar-ring`) are defined and mapped in `@theme inline` — use them for any sidebar surface.

**Chart tokens** (`--chart-1` through `--chart-5`) are available for data-viz. Do not invent new chart colors; extend this sequence if needed.

### Radius scale (derived from `--radius: 0.625rem`)

| Token | Calc |
|-------|------|
| `--radius-sm` | `var(--radius) * 0.6` → ~0.375rem |
| `--radius-md` | `var(--radius) * 0.8` → ~0.5rem |
| `--radius-lg` | `var(--radius)` → 0.625rem |
| `--radius-xl` | `var(--radius) * 1.4` → ~0.875rem |
| `--radius-2xl` | `var(--radius) * 1.8` |

Use `rounded-lg`, `rounded-xl`, etc. (Tailwind utilities) — they resolve to these vars via `@theme inline`.

### Token discipline rules

1. **No raw hex or RGB values in component code.** All colors must reference a semantic token (`bg-primary`, `text-muted-foreground`, `border-border`, etc.).
2. **Minimum contrast: 4.5:1** for normal text (WCAG 2.1 AA). `--foreground` on `--background` and `--primary-foreground` on `--primary` already meet this. Verify any new pairing before use.
3. **No hardcoded pixel values** for spacing — use the Tailwind scale (`p-4`, `gap-3`, `mt-2`, etc.).
4. Dark mode is handled by the `.dark` class (via `next-themes` `ThemeProvider`). The `@custom-variant dark (&:is(.dark *))` line in `index.css` enables `dark:` utilities project-wide.

---

## Style Ownership Layers

Defined authoritatively in `src/styles/README.md`:

| Layer | Location | What belongs here |
|-------|----------|-------------------|
| **Global shell** | `src/index.css` | Tailwind import, all shadcn oklch tokens (`:root`/`.dark`), Geist font wiring, global `@layer base` reset. No feature selectors. |
| **Domain-shared** | `src/styles/<domain>/index.css` | Non-module CSS shared across a domain's features. Must be imported from `src/index.css`. **Does not exist yet** — create only when needed. |
| **Feature-local** | `src/components/<domain>/<feature>/*.module.css` | CSS Modules imported directly by the owning component. Never routed through domain CSS or root CSS. |

**Current state:** no domain stylesheets exist. All styling is Tailwind utilities + shadcn tokens. This is correct; do not create `src/styles/` entries preemptively.

---

## When to Use CSS Modules

CSS Modules are the **escape hatch** — reach for them only when Tailwind utilities cannot express the requirement:

| Situation | Use CSS Module |
|-----------|----------------|
| `::before` / `::after` pseudo-elements with dynamic content | Yes |
| Multi-step `@keyframes` animations not covered by `tw-animate-css` | Yes |
| Layered `background` shorthand (multiple gradients, masks) | Yes |
| Complex `nth-child` or attribute selectors | Yes |
| Feature-local color skin that must not leak to siblings | Yes |
| Standard layout / spacing / typography | No — use Tailwind utilities |
| State variants (`hover:`, `focus:`, `disabled:`) | No — Tailwind handles these |
| Dark mode | No — use `dark:` Tailwind variant |
| Responsive breakpoints | No — use `sm:`, `md:`, `lg:` prefixes |

Rules for CSS Modules:
- File must live next to the component that owns it: `components/<domain>/<feature>/Feature.module.css`.
- Import it only in the owning `.tsx` file — never in `index.css` or a domain stylesheet.
- Class names must be accessed via the module object: `import s from './Feature.module.css'` → `className={s.root}`.

---

## JSW Brand Tokens (not yet defined — add before use)

The following tokens appear in `CLAUDE.md` and `frontend/CLAUDE.md` as planned but **do not yet exist in `src/index.css`**:

| Token | Intended role | Status |
|-------|---------------|--------|
| `--jsw-blue` | JSW Steel primary brand blue | **Not defined** |
| `--jsw-red` | JSW Steel accent red | **Not defined** |
| `--jsw-steel` | Steel-grey surface/accent | **Not defined** |

**Protocol for adding JSW brand tokens:**

1. Determine the exact brand-approved oklch values (no raw hex; convert with a tool).
2. Add them to `src/index.css` under `:root` and `.dark` alongside the existing shadcn tokens.
3. Map them into `@theme inline` so Tailwind utilities are generated:
   ```css
   @theme inline {
     --color-jsw-blue: var(--jsw-blue);
     --color-jsw-red:  var(--jsw-red);
     --color-jsw-steel: var(--jsw-steel);
   }
   ```
4. Reference them in components as `bg-jsw-blue`, `text-jsw-red`, `border-jsw-steel`.
5. Verify contrast against their paired foreground tokens before shipping.

Until these are defined, use the shadcn semantic tokens (`--primary`, `--secondary`, `--accent`) as stand-ins.

---

## Quick Reference: Using Tokens in Components

```tsx
// Correct — semantic Tailwind utility
<div className="bg-background text-foreground border border-border rounded-lg p-4">

// Correct — dark mode handled automatically
<button className="bg-primary text-primary-foreground hover:bg-primary/90">

// Correct — sidebar surface
<aside className="bg-sidebar text-sidebar-foreground border-r border-sidebar-border">

// WRONG — raw hex
<div style={{ color: '#1a3a6e' }}>

// WRONG — arbitrary color without a token
<div className="bg-[#1a3a6e]">
```

---

## Related Files

| File | Role |
|------|------|
| `frontend/src/index.css` | Single source of truth for all tokens |
| `frontend/src/styles/README.md` | Style layer ownership rules |
| `frontend/components.json` | shadcn CLI config (style, aliases, cssVariables) |
| `frontend/src/lib/utils.ts` | `cn()` class-merge helper — imported by all 51 shadcn ui files; do not move |
| `frontend/src/components/ui/` | Vendored shadcn primitives — extend, do not fork |

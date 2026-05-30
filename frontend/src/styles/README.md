# `src/styles/` — domain & shared stylesheets

Style ownership is layered (see `frontend-structure-standards`):

| Layer | Location | Holds |
|-------|----------|-------|
| Global shell | `src/index.css` | Tailwind import, design tokens (shadcn oklch `:root`/`.dark`), Geist font, global base/reset. **No feature selectors.** |
| Domain-shared | `src/styles/<domain>/index.css` | Non-module CSS shared across a domain's features. Imported from `src/index.css`. |
| Feature-local | `src/components/<domain>/<feature>/*.module.css` | CSS Modules imported **directly** by the owning component. |

## Rules

- **Tailwind utilities first** for layout, spacing, sizing, typography, breakpoints, and common state classes.
- **CSS Modules are the escape hatch** — pseudo-elements, keyframes, layered backgrounds, complex selectors, feature-local skins.
- CSS Modules must be imported by the owning component, **never** routed through domain CSS or root CSS.
- Once domain/feature style ownership exists, a monolithic app CSS file is a structural violation.

No domain stylesheets exist yet — this project styles entirely with Tailwind utilities + shadcn tokens. Add `src/styles/<domain>/index.css` (and import it from `src/index.css`) only when a domain needs shared non-module CSS.

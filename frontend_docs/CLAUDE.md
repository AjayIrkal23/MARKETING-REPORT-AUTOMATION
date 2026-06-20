<!-- dox:child v1 -->
# `frontend_docs/` — Frontend architecture documentation

Long-form, numbered frontend documentation. Complements the per-directory
`CLAUDE.md` files with cross-cutting topics like component patterns, state
management, routing, and styling.

## What lives here

| File | Topic |
|------|-------|
| `README.md` | Frontend docs landing page / table of contents |
| `ADDING_A_FEATURE.md` | How to add a new frontend feature end-to-end |
| `API_LAYER.md` | API client patterns and response handling |
| `ARCHITECTURE.md` | Frontend architecture overview |
| `COMPONENTS.md` | Component patterns and shadcn usage |
| `CONVENTIONS.md` | Naming, imports, file-size, typing rules |
| `PROJECT_REFERENCE_LINKAGE.md` | Cross-layer file map |
| `ROUTING.md` | Route structure and guards |
| `STATE_MANAGEMENT.md` | Redux patterns and async state |
| `STRUCTURE.md` | Directory layout philosophy |
| `STYLING.md` | Tailwind v4, design tokens, theming |
| `TYPES.md` | TypeScript conventions and domain types |

## Local conventions

- Update the relevant doc when a frontend convention, routing rule, or API pattern changes.
- Per-directory rules still live in the directory's own `CLAUDE.md`; these docs explain
  the *why* and the *cross-cutting* details.

## Up / down

- Parent: [`../CLAUDE.md`](../CLAUDE.md)
- Children: none (files only)
- Code tree: [`../frontend/CLAUDE.md`](../frontend/CLAUDE.md)

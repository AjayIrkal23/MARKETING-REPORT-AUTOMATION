<!-- dox:child v1 -->
# `frontend/src/components/ui/` — shadcn/ui primitives

Radix-based UI primitive components installed via shadcn/ui.

## What lives here

This folder contains ~55 reusable, unstyled/styled primitives (buttons, dialogs, tables, forms, etc.). Extend from here rather than forking Radix.

## Local conventions

- Do not add business logic here — these are presentational primitives.
- Customize via Tailwind classes and CSS variables, not by editing internals.

## Key files

| File | Role |
|------|------|
| `button.tsx` | Button primitive with variants. |
| `dialog.tsx` | Dialog / modal primitive. |
| `table.tsx` | Table primitive with sticky-header support. |
| `combobox.tsx` | Combobox primitive. |
| `select.tsx` | Select primitive. |

## Gotchas / fragile spots

- Updating shadcn components can overwrite local edits — prefer composition over modification.

## Up / down

- Parent: [`../CLAUDE.md`](../CLAUDE.md)
- Children: none
- Related repo docs: [`../../../../frontend_docs/COMPONENTS.md`](../../../../frontend_docs/COMPONENTS.md)

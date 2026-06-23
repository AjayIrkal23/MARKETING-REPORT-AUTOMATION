<!-- dox:child v1 -->
# `frontend/src/types/theme/` — Theme types

TypeScript types for theming.

## What lives here

Currently contains the theme mode type used by the theme provider and toggle.

## Local conventions

- Add design-token types here as the theme system grows.

## Key files

| File | Role |
|------|------|
| `theme.ts` | Theme mode type. |

## Gotchas / fragile spots

- Keep theme types minimal — most tokens are CSS variables.

## Up / down

- Parent: [`../CLAUDE.md`](../CLAUDE.md)
- Children: none
- Related repo docs: [`../../../../frontend_docs/TYPES.md`](../../../../frontend_docs/TYPES.md)

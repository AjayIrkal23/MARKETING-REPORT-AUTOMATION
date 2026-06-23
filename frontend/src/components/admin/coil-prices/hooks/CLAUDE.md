<!-- dox:child v1 -->
# `frontend/src/components/admin/coil-prices/hooks/` — Coil config hooks

Feature hooks for the Coil Config page.

## What lives here

Contains `useCoilPrices`, which fetches the per-coil-price list and owns the delete mutation.

## Local conventions

- Keep mutations in the hook, not in the table component.

## Key files

| File | Role |
|------|------|
| `useCoilPrices.ts` | List state + delete mutation. |

## Gotchas / fragile spots

- The list is not paginated; ensure the hook handles large lists gracefully.

## Up / down

- Parent: [`../CLAUDE.md`](../CLAUDE.md)
- Children: none
- Related repo docs: [`../../../../../../frontend_docs/COMPONENTS.md`](../../../../../../frontend_docs/COMPONENTS.md)

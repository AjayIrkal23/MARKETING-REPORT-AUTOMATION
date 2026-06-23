<!-- dox:child v1 -->
# `frontend/src/types/jvml-stock/` — JVML stock domain types

TypeScript types for the JVML Stock List feature.

## What lives here

Contains the row contract, sort/filter whitelists, query params, and UI state types. Structurally mirrors JSW Stock types.

## Local conventions

- Keep sort/filter literals in sync with the JSW Stock types where domains overlap.

## Key files

| File | Role |
|------|------|
| `stock.ts` | JVML Stock row, sort, field, and query types. |
| `stock-ui.ts` | JVML Stock UI state types. |

## Gotchas / fragile spots

- Any change to JSW Stock query/filter types should be evaluated for JVML parity.

## Up / down

- Parent: [`../CLAUDE.md`](../CLAUDE.md)
- Children: none
- Related repo docs: [`../../../../frontend_docs/TYPES.md`](../../../../frontend_docs/TYPES.md)

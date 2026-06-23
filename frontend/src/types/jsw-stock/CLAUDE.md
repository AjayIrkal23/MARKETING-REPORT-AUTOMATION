<!-- dox:child v1 -->
# `frontend/src/types/jsw-stock/` — JSW stock domain types

TypeScript types for the JSW Stock List feature.

## What lives here

Contains the full row contract, sort/filter whitelists, query params, and UI state types.

## Local conventions

- Sort/filter literals must match the backend `JswStockSortBy` / `JswStockField` exactly.
- Many SAP numeric columns are stored as text in the source file.

## Key files

| File | Role |
|------|------|
| `stock.ts` | JSW Stock row, sort, field, and query types. |
| `stock-ui.ts` | JSW Stock UI state types. |

## Gotchas / fragile spots

- `report_date` is a `dd-mm-yyyy` string, not an ISO date.

## Up / down

- Parent: [`../CLAUDE.md`](../CLAUDE.md)
- Children: none
- Related repo docs: [`../../../../frontend_docs/TYPES.md`](../../../../frontend_docs/TYPES.md)

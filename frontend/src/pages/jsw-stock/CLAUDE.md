<!-- dox:child v1 -->
# `frontend/src/pages/jsw-stock/` — JSW stock page

`/jsw-stock` route page.

## What lives here

Thin orchestrator for the JSW Stock List page: table, toolbar, pagination, and detail dialog.

## Local conventions

- All state comes from `useJswStockList`.

## Key files

| File | Role |
|------|------|
| `index.tsx` | JSW Stock List page component. |

## Gotchas / fragile spots

- Route is protected but available to all authenticated users (not admin-only).

## Up / down

- Parent: [`../CLAUDE.md`](../CLAUDE.md)
- Children: none
- Related repo docs: [`../../../../frontend_docs/ROUTING.md`](../../../../frontend_docs/ROUTING.md)

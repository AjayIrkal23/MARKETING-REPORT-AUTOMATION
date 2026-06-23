<!-- dox:child v1 -->
# `frontend/src/pages/jvml-stock/` — JVML stock page

`/jvml-stock` route page.

## What lives here

Thin orchestrator for the JVML Stock List page: table, toolbar, pagination, and detail dialog.

## Local conventions

- All state comes from `useJvmlStockList`.

## Key files

| File | Role |
|------|------|
| `index.tsx` | JVML Stock List page component. |

## Gotchas / fragile spots

- Route is protected but available to all authenticated users (not admin-only).

## Up / down

- Parent: [`../CLAUDE.md`](../CLAUDE.md)
- Children: none
- Related repo docs: [`../../../../frontend_docs/ROUTING.md`](../../../../frontend_docs/ROUTING.md)

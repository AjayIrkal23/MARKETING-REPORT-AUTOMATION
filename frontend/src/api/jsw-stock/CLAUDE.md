<!-- dox:child v1 -->
# `frontend/src/api/jsw-stock/` — JSW stock API

HTTP wrappers for the `/jsw-stock` endpoints.

## What lives here

Read-only browse and export for the daily JSW current-stock report. All filtering, sorting, and pagination is server-driven.

## Local conventions

- Normalize `date` to `'dd-MM-yyyy'` before sending.
- Export reuses the same query params as the list endpoint.

## Key files

| File | Role |
|------|------|
| `list.ts` | `GET /jsw-stock` — paginated, filtered list. |
| `options.ts` | `GET /jsw-stock/options?field=...` — async filter options. |
| `export.ts` | `GET /jsw-stock/export` — binary `.xlsx` download. |

## Gotchas / fragile spots

- Filter keys are snake_case and must match the backend `JswStockListQuery` exactly.

## Up / down

- Parent: [`../CLAUDE.md`](../CLAUDE.md)
- Children: none
- Related repo docs: [`../../../../frontend_docs/API_LAYER.md`](../../../../frontend_docs/API_LAYER.md)

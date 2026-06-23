<!-- dox:child v1 -->
# `frontend/src/api/jvml-stock/` — JVML stock API

HTTP wrappers for the `/jvml-stock` endpoints.

## What lives here

Read-only browse and export for the daily JVML Stock (99) report. Structurally identical to the JSW stock API.

## Local conventions

- Shares the same 5-filter contract as JSW Stock.
- Export reuses the same query params as the list endpoint.

## Key files

| File | Role |
|------|------|
| `list.ts` | `GET /jvml-stock` — paginated, filtered list. |
| `options.ts` | `GET /jvml-stock/options?field=...` — async filter options. |
| `export.ts` | `GET /jvml-stock/export` — binary `.xlsx` download. |

## Gotchas / fragile spots

- Keep JVML filters in sync with JSW Stock — both use the same field key contract.

## Up / down

- Parent: [`../CLAUDE.md`](../CLAUDE.md)
- Children: none
- Related repo docs: [`../../../../frontend_docs/API_LAYER.md`](../../../../frontend_docs/API_LAYER.md)

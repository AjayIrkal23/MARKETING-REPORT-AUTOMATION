<!-- dox:child v1 -->
# `frontend/src/api/settings/jsw-stock-config/` — JSW stock config API

HTTP wrappers for the `/admin/jsw-stock` scheduler settings.

## What lives here

Load, update, status, and run-now for the JSW Stock Excel ingestion scheduler.

## Local conventions

- Uses `putData` for updates.
- Status includes recent ingestion rows.

## Key files

| File | Role |
|------|------|
| `get.ts` | `GET /admin/jsw-stock/config`. |
| `update.ts` | `PUT /admin/jsw-stock/config`. |
| `status.ts` | `GET /admin/jsw-stock/status`. |
| `runNow.ts` | `POST /admin/jsw-stock/run-now`. |

## Gotchas / fragile spots

- `file_name` is stored without the `.xlsx` extension.

## Up / down

- Parent: [`../CLAUDE.md`](../CLAUDE.md)
- Children: none
- Related repo docs: [`../../../../../frontend_docs/API_LAYER.md`](../../../../../frontend_docs/API_LAYER.md)

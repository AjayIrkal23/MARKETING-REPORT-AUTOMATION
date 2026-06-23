<!-- dox:child v1 -->
# `frontend/src/api/settings/jvml-stock-config/` — JVML stock config API

HTTP wrappers for the `/admin/jvml-stock` scheduler settings.

## What lives here

Load, update, status, and run-now for the JVML Stock Excel ingestion scheduler. Identical in structure to the JSW stock config module.

## Local conventions

- Uses `putData` for updates.
- Status includes recent ingestion rows.

## Key files

| File | Role |
|------|------|
| `get.ts` | `GET /admin/jvml-stock/config`. |
| `update.ts` | `PUT /admin/jvml-stock/config`. |
| `status.ts` | `GET /admin/jvml-stock/status`. |
| `runNow.ts` | `POST /admin/jvml-stock/run-now`. |

## Gotchas / fragile spots

- Keep in sync with `jsw-stock-config/` — the UI treats both domains uniformly.

## Up / down

- Parent: [`../CLAUDE.md`](../CLAUDE.md)
- Children: none
- Related repo docs: [`../../../../../frontend_docs/API_LAYER.md`](../../../../../frontend_docs/API_LAYER.md)

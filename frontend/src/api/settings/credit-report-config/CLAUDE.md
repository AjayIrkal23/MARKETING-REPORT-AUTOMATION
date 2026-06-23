<!-- dox:child v1 -->
# `frontend/src/api/settings/credit-report-config/` — Credit report config API

HTTP wrappers for the `/admin/credit-report` scheduler settings.

## What lives here

Load, update, status, and run-now for the Credit Report ingestion scheduler. Mirrors the JSW/JVML config modules.

## Local conventions

- Uses `putData` for updates.
- Run-now returns the updated status payload.

## Key files

| File | Role |
|------|------|
| `get.ts` | `GET /admin/credit-report/config`. |
| `update.ts` | `PUT /admin/credit-report/config`. |
| `status.ts` | `GET /admin/credit-report/status`. |
| `runNow.ts` | `POST /admin/credit-report/run-now`. |

## Gotchas / fragile spots

- Keep the shape identical to the JSW/JVML config modules where possible.

## Up / down

- Parent: [`../CLAUDE.md`](../CLAUDE.md)
- Children: none
- Related repo docs: [`../../../../../frontend_docs/API_LAYER.md`](../../../../../frontend_docs/API_LAYER.md)

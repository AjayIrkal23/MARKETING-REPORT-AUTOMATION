<!-- dox:child v1 -->
# `frontend/src/api/settings/credit-report-config/` — Credit report config API

HTTP wrappers for the `/admin/credit-report` scheduler settings.

## What lives here

Load, update, status, run-all, and run-one-zone for the Credit Report ingestion scheduler.

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
| `runNowZone.ts` | `POST /admin/credit-report/run-now/{regionId}`. |

## Gotchas / fragile spots

- Credit Report is region-zone aware; do not mirror the JSW/JVML global-run UI blindly.

## Up / down

- Parent: [`../CLAUDE.md`](../CLAUDE.md)
- Children: none
- Related repo docs: [`../../../../../frontend_docs/API_LAYER.md`](../../../../../frontend_docs/API_LAYER.md)

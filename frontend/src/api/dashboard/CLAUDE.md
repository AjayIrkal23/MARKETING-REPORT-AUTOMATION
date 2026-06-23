<!-- dox:child v1 -->
# `frontend/src/api/dashboard/` — Dashboard API

HTTP wrappers for the `/dashboard` endpoints.

## What lives here

Read-only summary endpoints that back the home dashboard cards and analytics.

## Local conventions

- Dashboard data is fetched on mount with no query params.
- Keep analytics endpoints here as they are added.

## Key files

| File | Role |
|------|------|
| `summary.ts` | `GET /dashboard/summary` — today's ingestion status cards. |

## Gotchas / fragile spots

- Summary is always 'today' from the backend — do not pass a date parameter.

## Up / down

- Parent: [`../CLAUDE.md`](../CLAUDE.md)
- Children: none
- Related repo docs: [`../../../../frontend_docs/API_LAYER.md`](../../../../frontend_docs/API_LAYER.md)

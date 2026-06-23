<!-- dox:child v1 -->
# `frontend/src/api/admin/audit-logs/` — Audit logs API

HTTP wrappers for the `/admin/audit-logs` endpoints.

## What lives here

Supports paginated listing, detail fetch, and facet loading for the admin Audit Logs page.

## Local conventions

- Facets are loaded once and cached in the feature hook.
- Query params match `AuditLogListQuery` from `src/types/admin/audit-log.ts`.

## Key files

| File | Role |
|------|------|
| `list.ts` | `GET /admin/audit-logs` — paginated list. |
| `get.ts` | `GET /admin/audit-logs/{id}` — detail payload. |
| `facets.ts` | `GET /admin/audit-logs/facets` — filter option buckets. |
| `options.ts` | Per-field async option search. |

## Gotchas / fragile spots

- Facet failures are tolerated by the hook — the toolbar falls back to static enums.

## Up / down

- Parent: [`../CLAUDE.md`](../CLAUDE.md)
- Children: none
- Related repo docs: [`../../../../../frontend_docs/API_LAYER.md`](../../../../../frontend_docs/API_LAYER.md)

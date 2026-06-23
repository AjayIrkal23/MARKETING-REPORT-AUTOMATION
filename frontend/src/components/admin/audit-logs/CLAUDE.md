<!-- dox:child v1 -->
# `frontend/src/components/admin/audit-logs/` — Audit logs UI

Components for the admin Audit Logs page.

## What lives here

Server-driven table, toolbar, pagination, and detail sheet for browsing system-wide audit events. State lives in `hooks/useAuditLogs.ts`.

## Local conventions

- Components are presentational; all state comes from `useAuditLogs`.
- Badges (`AuditCategoryBadge`, `AuditOutcomeBadge`) use fixed color maps.

## Key files

| File | Role |
|------|------|
| `AuditLogTable.tsx` | Sortable server-driven table. |
| `AuditLogToolbar.tsx` | Search + category/outcome/method/date filters. |
| `AuditLogPagination.tsx` | Page/limit controls. |
| `ViewAuditLogSheet.tsx` | Read-only detail panel. |
| `AuditCategoryBadge.tsx` | Color-coded audit category badge. |
| `AuditOutcomeBadge.tsx` | Success/failure outcome badge. |
| `hooks/useAuditLogs.ts` | Query state, fetch effect, facets, view sheet. |

## Gotchas / fragile spots

- Facets are loaded once on mount; failures fall back to static filter enums.

## Up / down

- Parent: [`../CLAUDE.md`](../CLAUDE.md)
- Children: [`hooks/`](hooks/CLAUDE.md)
- Related repo docs: [`../../../../../frontend_docs/COMPONENTS.md`](../../../../../frontend_docs/COMPONENTS.md)

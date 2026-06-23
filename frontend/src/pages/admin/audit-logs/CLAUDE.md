<!-- dox:child v1 -->
# `frontend/src/pages/admin/audit-logs/` — Audit logs page

`/admin/audit-logs` route page.

## What lives here

Thin orchestrator that wires `useAuditLogs` with the audit table, toolbar, pagination, and view sheet.

## Local conventions

- Zero business logic; all state comes from the feature hook.

## Key files

| File | Role |
|------|------|
| `index.tsx` | Audit Logs page component. |

## Gotchas / fragile spots

- Route is guarded by `AdminRoute`.

## Up / down

- Parent: [`../CLAUDE.md`](../CLAUDE.md)
- Children: none
- Related repo docs: [`../../../../../frontend_docs/ROUTING.md`](../../../../../frontend_docs/ROUTING.md)

<!-- dox:child v1 -->
# `frontend/src/components/admin/audit-logs/hooks/` — Audit logs hooks

Feature hooks for the Audit Logs page.

## What lives here

Contains `useAuditLogs`, which owns all query/server/view state for the audit log list and detail sheet.

## Local conventions

- Hook returns a flat state object consumed by page and components.
- Race-safe fetches via `fetchIdRef`.

## Key files

| File | Role |
|------|------|
| `useAuditLogs.ts` | All Audit Logs page state. |

## Gotchas / fragile spots

- Keep query setters colocated — the toolbar uses `onQueryChange` with partial patches.

## Up / down

- Parent: [`../CLAUDE.md`](../CLAUDE.md)
- Children: none
- Related repo docs: [`../../../../../../frontend_docs/COMPONENTS.md`](../../../../../../frontend_docs/COMPONENTS.md)

<!-- dox:child v1 -->
# `frontend/src/pages/admin/users/` — User management page

`/admin/users` route page.

## What lives here

Thin orchestrator for the User Management screen: table, toolbar, pagination, and all user dialogs.

## Local conventions

- All state comes from `useUserManagement`.
- Page prevents self-disable/delete via the session user email.

## Key files

| File | Role |
|------|------|
| `index.tsx` | User Management page component. |

## Gotchas / fragile spots

- Route is guarded by `AdminRoute`.

## Up / down

- Parent: [`../CLAUDE.md`](../CLAUDE.md)
- Children: none
- Related repo docs: [`../../../../../frontend_docs/ROUTING.md`](../../../../../frontend_docs/ROUTING.md)

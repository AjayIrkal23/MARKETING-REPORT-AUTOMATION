<!-- dox:child v1 -->
# `frontend/src/components/admin/users/` — User management UI

Components for the admin User Management page.

## What lives here

Server-driven table, toolbar, pagination, and dialogs for managing marketing report user accounts. State lives in `hooks/useUserManagement.ts`.

## Local conventions

- Dialog state is a discriminated union covering create/view/edit/password/confirm.
- Current user cannot disable/delete themselves.

## Key files

| File | Role |
|------|------|
| `UserTable.tsx` | Sortable server-driven table. |
| `UserTableToolbar.tsx` | Search + status/role filters + create button. |
| `UserTablePagination.tsx` | Page/limit controls. |
| `CreateUserDialog.tsx` | Create user dialog. |
| `EditUserDialog.tsx` | Edit user dialog. |
| `ViewUserSheet.tsx` | Read-only user detail sheet. |
| `ChangePasswordDialog.tsx` | Reset/set password dialog. |
| `ConfirmActionDialog.tsx` | Enable/disable/delete confirmation. |
| `UserStatusBadge.tsx` | Invited/active/disabled badge. |
| `hooks/useUserManagement.ts` | All page state + mutations. |

## Gotchas / fragile spots

- Page maps toolbar `onQueryChange` to granular hook setters.

## Up / down

- Parent: [`../CLAUDE.md`](../CLAUDE.md)
- Children: [`hooks/`](hooks/CLAUDE.md)
- Related repo docs: [`../../../../../frontend_docs/COMPONENTS.md`](../../../../../frontend_docs/COMPONENTS.md)

<!-- dox:child v1 -->
# `frontend/src/components/admin/users/hooks/` — User management hooks

Feature hooks for the User Management page.

## What lives here

Contains `useUserManagement`, which owns query state, server state, dialog state, and all CRUD mutations.

## Local conventions

- All mutations toast on success/failure and refetch the list.
- Race-safe list fetch via `fetchIdRef`.

## Key files

| File | Role |
|------|------|
| `useUserManagement.ts` | All User Management page state + mutations. |

## Gotchas / fragile spots

- Reset password can either set a value or clear it to force OTP re-setup.

## Up / down

- Parent: [`../CLAUDE.md`](../CLAUDE.md)
- Children: none
- Related repo docs: [`../../../../../../frontend_docs/COMPONENTS.md`](../../../../../../frontend_docs/COMPONENTS.md)

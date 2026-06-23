<!-- dox:child v1 -->
# `frontend/src/api/admin/users/` — User management API

HTTP wrappers for the `/admin/users` endpoints.

## What lives here

Full admin lifecycle: create, update, enable/disable, delete, and password reset for marketing-report user accounts.

## Local conventions

- Create returns the invited user; the backend sends an OTP email.
- Reset password can set a value or clear it to force re-setup.

## Key files

| File | Role |
|------|------|
| `list.ts` | `GET /admin/users`. |
| `get.ts` | `GET /admin/users/{id}`. |
| `create.ts` | `POST /admin/users`. |
| `update.ts` | `PATCH /admin/users/{id}`. |
| `remove.ts` | `DELETE /admin/users/{id}`. |
| `enable.ts` | `POST /admin/users/{id}/enable`. |
| `disable.ts` | `POST /admin/users/{id}/disable`. |
| `resetPassword.ts` | `POST /admin/users/{id}/reset-password`. |
| `options.ts` | Per-field async option search. |

## Gotchas / fragile spots

- Admins cannot disable/delete themselves — the page guards against this client-side.

## Up / down

- Parent: [`../CLAUDE.md`](../CLAUDE.md)
- Children: none
- Related repo docs: [`../../../../../frontend_docs/API_LAYER.md`](../../../../../frontend_docs/API_LAYER.md)

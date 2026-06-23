<!-- dox:child v1 -->
# `backend/app/services/admin_user/` — Admin user management

CRUD, lifecycle, and search services for the admin user-management domain.

## What lives here

Each module performs one admin action on the `User` collection. Controllers in
`app/controllers/admin_user.py` call these functions and wrap the results in the
standard envelope.

## Local conventions

- Every public function is transport-free and raises typed `AppError` subclasses.
- Pass `actor_email=admin.emailid` from the controller for audit threading.
- Return `AdminUserPublic` DTOs, never raw `User` documents.
- New users are created in the `invited` state with no password.

## Key files

| File | Role |
|------|------|
| `__init__.py` | Package docstring. |
| `create.py` | Create an invited user and send an invitation email. |
| `delete.py` | Delete a user (with self/last-admin guards). |
| `disable.py` / `enable.py` | Toggle user status. |
| `get.py` | Fetch a single user by ObjectId. |
| `list.py` | Backend-driven paginated user list. |
| `options.py` | Async combobox search over name/email. |
| `reset_password.py` | Set or clear a user's password. |
| `update.py` | Partial update of name and/or admin flag. |

## Gotchas / fragile spots

- `create.py` sends the invite email after persistence; email failure is logged
  but does not roll back the created user.
- `delete.py` prevents deleting the last admin or deleting yourself.
- Sort/filter field names must stay in sync with `schemas/admin_user.py` and
  `utils/admin_user/query.py`.

## Up / down

- Parent: [`../CLAUDE.md`](../CLAUDE.md)
- Children: none
- Related repo docs: [`backend_docs/SERVICES.md`](../../../backend_docs/SERVICES.md)

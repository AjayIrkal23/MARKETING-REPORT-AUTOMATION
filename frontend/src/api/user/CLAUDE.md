<!-- dox:child v1 -->
# `frontend/src/api/user/` — Current-user API

HTTP wrappers for the authenticated user endpoints.

## What lives here

Endpoints for the currently logged-in user that are outside the admin namespace. Currently a minimal placeholder for self-service operations.

## Local conventions

- Add self-service endpoints here (profile, password change, etc.).

## Key files

| File | Role |
|------|------|
| `list.ts` | `GET /user` — placeholder current-user list/summary. |

## Gotchas / fragile spots

- This folder is intentionally small; most user operations are under `admin/users/`.

## Up / down

- Parent: [`../CLAUDE.md`](../CLAUDE.md)
- Children: none
- Related repo docs: [`../../../../frontend_docs/API_LAYER.md`](../../../../frontend_docs/API_LAYER.md)

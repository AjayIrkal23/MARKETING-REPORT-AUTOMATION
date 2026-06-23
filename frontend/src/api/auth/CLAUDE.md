<!-- dox:child v1 -->
# `frontend/src/api/auth/` — Auth API client

HTTP wrappers for the `/auth/*` endpoints.

## What lives here

Handles login, logout, current-user restore, and account-status checks. OTP setup endpoints live in the `setup/` sub-folder.

## Local conventions

- Use `getMe()` on app bootstrap to validate the httpOnly session cookie.
- Return typed domain models from `src/types/auth/`.

## Key files

| File | Role |
|------|------|
| `login.ts` | `POST /auth/login`. |
| `logout.ts` | `POST /auth/logout` — best-effort cookie clearing. |
| `me.ts` | `GET /auth/me` — restore current session. |
| `accountStatus.ts` | `POST /auth/account-status` — detects invited accounts. |

## Gotchas / fragile spots

- `login.ts` returns `AuthUser`; convert to `SessionUser` before dispatching.

## Up / down

- Parent: [`../CLAUDE.md`](../CLAUDE.md)
- Children: [`setup/`](setup/CLAUDE.md)
- Related repo docs: [`../../../../frontend_docs/API_LAYER.md`](../../../../frontend_docs/API_LAYER.md)

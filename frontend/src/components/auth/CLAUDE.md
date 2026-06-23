<!-- dox:child v1 -->
# `frontend/src/components/auth/` — Auth components

Auth-related components and hooks.

## What lives here

Contains `AuthBootstrap` (session restoration on app mount) and `useLogout`. Login-specific components live in the `login/` sub-folder.

## Local conventions

- AuthBootstrap runs `GET /auth/me` once on mount and clears stale sessions.
- Logout clears the client session regardless of API outcome.

## Key files

| File | Role |
|------|------|
| `AuthBootstrap.tsx` | Validates stored session on app mount. |
| `hooks/useLogout.ts` | Logout handler with navigation. |

## Gotchas / fragile spots

- Do not add login form UI here — use `login/`.

## Up / down

- Parent: [`../CLAUDE.md`](../CLAUDE.md)
- Children: [`hooks/`](hooks/CLAUDE.md) · [`login/`](login/CLAUDE.md)
- Related repo docs: [`../../../../frontend_docs/COMPONENTS.md`](../../../../frontend_docs/COMPONENTS.md)

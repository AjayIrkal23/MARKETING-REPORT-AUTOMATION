<!-- dox:child v1 -->
# `frontend/src/components/auth/hooks/` — Auth hooks

Cross-cutting auth hooks.

## What lives here

Contains `useLogout`, which calls the logout endpoint and navigates to login. Login form hooks live in `login/hooks/`.

## Local conventions

- Keep auth hooks small and focused on session actions.

## Key files

| File | Role |
|------|------|
| `useLogout.ts` | Logout mutation + Redux session clear + redirect. |

## Gotchas / fragile spots

- Logout is best-effort: client state is cleared even if the API call fails.

## Up / down

- Parent: [`../CLAUDE.md`](../CLAUDE.md)
- Children: none
- Related repo docs: [`../../../../../frontend_docs/COMPONENTS.md`](../../../../../frontend_docs/COMPONENTS.md)

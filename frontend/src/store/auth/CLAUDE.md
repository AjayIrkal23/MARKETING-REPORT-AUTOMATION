<!-- dox:child v1 -->
# `frontend/src/store/auth/` — Auth Redux slice

Session state, actions, and selectors for authentication.

## What lives here

Manages the client-side auth session: optimistic load from `localStorage`, login success, logout, and bootstrap completion. The actual session lives in an httpOnly cookie; this slice tracks the client projection.

## Local conventions

- Mutate state only through slice actions.
- Use `selectIsAuthenticated` / `selectIsAdmin` from `selectors.ts` in components.

## Key files

| File | Role |
|------|------|
| `slice.ts` | Auth reducer with `loginSuccess`, `logout`, `finishBootstrap`. |
| `selectors.ts` | Auth selectors (`selectSessionUser`, `selectIsAdmin`, etc.). |
| `session-user.ts` | Maps `AuthUser` to `SessionUser`. |

## Gotchas / fragile spots

- The legacy `app.auth.token` localStorage key is removed on load.
- `AuthBootstrap` verifies the stored user with `GET /auth/me`.

## Up / down

- Parent: [`../CLAUDE.md`](../CLAUDE.md)
- Children: none
- Related repo docs: [`../../../../frontend_docs/STATE_MANAGEMENT.md`](../../../../frontend_docs/STATE_MANAGEMENT.md)

<!-- dox:child v1 -->
# `frontend/src/routes/` — Route guards

Authentication and authorization route wrappers.

## What lives here

Houses `ProtectedRoute` (requires login) and `AdminRoute` (requires admin role). Actual page components live in `src/pages/`; this folder only contains guards.

## Local conventions

- Guards read auth state from the Redux store.
- Add new route guards here; do not put page UI here.

## Key files

| File | Role |
|------|------|
| `ProtectedRoute.tsx` | Redirects unauthenticated users to `/login`. |
| `AdminRoute.tsx` | Redirects non-admins to `/home`. |

## Gotchas / fragile spots

- Route definitions are in `src/App.tsx`, not here.

## Up / down

- Parent: [`../CLAUDE.md`](../CLAUDE.md)
- Children: none
- Related repo docs: [`../../../frontend_docs/ROUTING.md`](../../../frontend_docs/ROUTING.md)

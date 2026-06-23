<!-- dox:child v1 -->
# `frontend/src/store/` — Redux slices

Domain-specific Redux slices and selectors.

## What lives here

Each sub-folder is a self-contained slice (state, actions, selectors). Slices are registered in `src/app/store.ts`. UI components should use the typed hooks from `src/app/hooks.ts`.

## Local conventions

- One slice per domain folder.
- Keep slices small and focused; async server state stays in feature hooks.

## Key files

| File | Role |
|------|------|
| `auth/slice.ts` | Auth state: isAuthenticated, user, loading. |
| `auth/selectors.ts` | Memoized auth selectors including `selectIsAdmin`. |
| `auth/session-user.ts` | Adapter from API user to session user. |

## Gotchas / fragile spots

- Auth bootstrapping is handled by `AuthBootstrap.tsx` in `components/auth/`.

## Up / down

- Parent: [`../CLAUDE.md`](../CLAUDE.md)
- Children: [`auth/`](auth/CLAUDE.md)
- Related repo docs: [`../../../frontend_docs/STATE_MANAGEMENT.md`](../../../frontend_docs/STATE_MANAGEMENT.md)

<!-- dox:child v1 -->
# `frontend/src/pages/auth/` — Auth pages

Top-level page components for authentication routes.

## What lives here

Currently only the `/login` route. The login page itself lives in the `login/` sub-folder.

## Local conventions

- Auth pages are rendered outside `DashboardLayout`.

## Key files

| File | Role |
|------|------|
| `login/index.tsx` | `/login` page component. |

## Gotchas / fragile spots

- Authenticated users are redirected away from `/login`.

## Up / down

- Parent: [`../CLAUDE.md`](../CLAUDE.md)
- Children: [`login/`](login/CLAUDE.md)
- Related repo docs: [`../../../../frontend_docs/ROUTING.md`](../../../../frontend_docs/ROUTING.md)

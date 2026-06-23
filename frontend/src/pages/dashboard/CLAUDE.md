<!-- dox:child v1 -->
# `frontend/src/pages/dashboard/` — Dashboard pages

Top-level page components for dashboard routes.

## What lives here

Currently only the `/home` route. Future analytics pages can be added here.

## Local conventions

- Dashboard pages live inside `DashboardLayout`.

## Key files

| File | Role |
|------|------|
| `home/index.tsx` | `/home` landing page with status cards. |

## Gotchas / fragile spots

- `/home` is the default redirect after login.

## Up / down

- Parent: [`../CLAUDE.md`](../CLAUDE.md)
- Children: [`home/`](home/CLAUDE.md)
- Related repo docs: [`../../../../frontend_docs/ROUTING.md`](../../../../frontend_docs/ROUTING.md)

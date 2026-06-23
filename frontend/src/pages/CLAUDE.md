<!-- dox:child v1 -->
# `frontend/src/pages/` — Route pages

Top-level React components bound to routes.

## What lives here

Each folder corresponds to a route in `src/App.tsx`. Pages are thin orchestrators that wire feature components and hooks; they contain no business logic.

## Local conventions

- One `index.tsx` per page folder exporting the page component.
- Keep pages under 250 lines; move UI into `src/components/<domain>/`.

## Key files

| File | Role |
|------|------|
| `dashboard/home/index.tsx` | `/home` dashboard page. |
| `jsw-stock/index.tsx` | `/jsw-stock` JSW Stock List page. |
| `admin/users/index.tsx` | `/admin/users` User Management page. |
| `auth/login/index.tsx` | `/login` page. |

## Gotchas / fragile spots

- Route guards (`ProtectedRoute`, `AdminRoute`) are in `src/routes/`, not pages.

## Up / down

- Parent: [`../CLAUDE.md`](../CLAUDE.md)
- Children: [`admin/`](admin/CLAUDE.md) · [`auth/`](auth/CLAUDE.md) · [`credit-report/`](credit-report/CLAUDE.md) · [`dashboard/`](dashboard/CLAUDE.md) · [`jsw-stock/`](jsw-stock/CLAUDE.md) · [`jvml-stock/`](jvml-stock/CLAUDE.md) · [`report/`](report/CLAUDE.md)
- Related repo docs: [`../../../frontend_docs/ROUTING.md`](../../../frontend_docs/ROUTING.md)

<!-- dox:child v1 -->
# `frontend/src/pages/admin/` — Admin pages

Top-level page components for admin routes.

## What lives here

Each folder exports a single page component used inside `AdminRoute` in `src/App.tsx`. Pages delegate to components in `src/components/admin/`.

## Local conventions

- Pages are thin orchestrators only.
- All admin pages share the dashboard layout from `components/layout/`.

## Key files

| File | Role |
|------|------|
| `users/index.tsx` | `/admin/users` — User Management. |
| `audit-logs/index.tsx` | `/admin/audit-logs` — Audit Logs. |
| `regions/index.tsx` | `/admin/regions` — Region Management. |
| `customer-codes/index.tsx` | `/admin/customer-codes` — Customer Codes. |
| `coil-config/index.tsx` | `/admin/coil-config` — Coil Config. |
| `settings/index.tsx` | `/admin/settings` — Scheduler Settings. |

## Gotchas / fragile spots

- These routes are nested under `AdminRoute` in `App.tsx`.

## Up / down

- Parent: [`../CLAUDE.md`](../CLAUDE.md)
- Children: [`audit-logs/`](audit-logs/CLAUDE.md) · [`coil-config/`](coil-config/CLAUDE.md) · [`customer-codes/`](customer-codes/CLAUDE.md) · [`regions/`](regions/CLAUDE.md) · [`settings/`](settings/CLAUDE.md) · [`users/`](users/CLAUDE.md)
- Related repo docs: [`../../../../frontend_docs/ROUTING.md`](../../../../frontend_docs/ROUTING.md)

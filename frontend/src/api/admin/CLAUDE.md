<!-- dox:child v1 -->
# `frontend/src/api/admin/` — Admin API clients

HTTP wrappers for the `/admin/*` endpoints.

## What lives here

Each admin domain (users, audit logs, regions, customer codes, coil prices) has its own sub-folder. All endpoints require an admin session.

## Local conventions

- Mirror backend route namespaces in folder names.
- List endpoints return `PaginatedResult<T>` from `getList`.

## Key files

| File | Role |
|------|------|
| `users/list.ts` | `GET /admin/users`. |
| `audit-logs/list.ts` | `GET /admin/audit-logs`. |
| `regions/list.ts` | `GET /admin/regions`. |
| `customer-codes/list.ts` | `GET /admin/customer-codes`. |
| `coil-prices/list.ts` | `GET /admin/coil-prices`. |

## Gotchas / fragile spots

- Non-admin requests return 403 from the backend; the frontend relies on `AdminRoute`.

## Up / down

- Parent: [`../CLAUDE.md`](../CLAUDE.md)
- Children: [`audit-logs/`](audit-logs/CLAUDE.md) · [`coil-prices/`](coil-prices/CLAUDE.md) · [`customer-codes/`](customer-codes/CLAUDE.md) · [`regions/`](regions/CLAUDE.md) · [`users/`](users/CLAUDE.md)
- Related repo docs: [`../../../../frontend_docs/API_LAYER.md`](../../../../frontend_docs/API_LAYER.md)

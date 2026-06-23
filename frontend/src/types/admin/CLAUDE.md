<!-- dox:child v1 -->
# `frontend/src/types/admin/` — Admin domain types

TypeScript types for admin features.

## What lives here

Contains audit logs, coil prices, customer codes, regions, and user management contracts and UI state types.

## Local conventions

- Each sub-domain has its own file pair (domain + `-ui`).
- Sort/filter literals must match backend whitelists exactly.

## Key files

| File | Role |
|------|------|
| `user.ts` | Admin user API contracts and query types. |
| `user-ui.ts` | User management UI state types. |
| `audit-log.ts` | Audit log API contracts. |
| `audit-log-ui.ts` | Audit log UI state types. |
| `region.ts` | Region API contracts. |
| `customer-code.ts` | Customer code API contracts. |
| `coil-price.ts` | Coil price API contracts. |
| `options.ts` | Shared async option type. |

## Gotchas / fragile spots

- `options.ts` is imported by many async comboboxes across domains.

## Up / down

- Parent: [`../CLAUDE.md`](../CLAUDE.md)
- Children: none
- Related repo docs: [`../../../../frontend_docs/TYPES.md`](../../../../frontend_docs/TYPES.md)

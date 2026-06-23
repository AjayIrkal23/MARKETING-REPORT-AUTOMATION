<!-- dox:child v1 -->
# `frontend/src/types/api/` — API envelope types

Shared API response and pagination contracts.

## What lives here

Defines the standard envelope shape, pagination metadata, and base query interfaces used by all API modules.

## Local conventions

- All list endpoints return `PaginatedResult<T>`.
- `PageQuery` is extended by domain list queries.

## Key files

| File | Role |
|------|------|
| `envelope.ts` | `ApiSuccess`, `PaginationMeta`, `PageQuery`, `PaginatedResult`. |
| `error.ts` | Backend error body contract. |

## Gotchas / fragile spots

- `meta` is optional on `ApiSuccess` but required inside `PaginatedResult`.

## Up / down

- Parent: [`../CLAUDE.md`](../CLAUDE.md)
- Children: none
- Related repo docs: [`../../../../frontend_docs/TYPES.md`](../../../../frontend_docs/TYPES.md)

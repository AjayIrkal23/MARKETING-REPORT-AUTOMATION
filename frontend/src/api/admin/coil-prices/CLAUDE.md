<!-- dox:child v1 -->
# `frontend/src/api/admin/coil-prices/` — Coil price API

HTTP wrappers for the `/admin/coil-prices` endpoints.

## What lives here

CRUD for per-coil-price config entries used by the Coil Config admin page. Entries are unique by `quantity` and carry an `active` flag.

## Local conventions

- List fetches up to 100 entries sorted by `quantity` ascending — no pagination UI.
- Money values are sent/received as numbers (INR).

## Key files

| File | Role |
|------|------|
| `list.ts` | `GET /admin/coil-prices`. |
| `create.ts` | `POST /admin/coil-prices`. |
| `update.ts` | `PATCH /admin/coil-prices/{id}`. |
| `remove.ts` | `DELETE /admin/coil-prices/{id}`. |

## Gotchas / fragile spots

- The list is intentionally compact; verify the backend enforces the quantity uniqueness.

## Up / down

- Parent: [`../CLAUDE.md`](../CLAUDE.md)
- Children: none
- Related repo docs: [`../../../../../frontend_docs/API_LAYER.md`](../../../../../frontend_docs/API_LAYER.md)

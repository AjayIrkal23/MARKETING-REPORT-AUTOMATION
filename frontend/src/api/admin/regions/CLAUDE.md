<!-- dox:child v1 -->
# `frontend/src/api/admin/regions/` — Region API

HTTP wrappers for the `/admin/regions` endpoints.

## What lives here

CRUD and option search for sales regions. Regions own an email notification list and are referenced by customer codes and stock filters.

## Local conventions

- Boolean `active` is normalized to `'true'`/`'false'` strings before `buildQuery`.
- Email lists are edited via the shared `EmailChipInput` component.

## Key files

| File | Role |
|------|------|
| `list.ts` | `GET /admin/regions`. |
| `get.ts` | `GET /admin/regions/{id}`. |
| `create.ts` | `POST /admin/regions`. |
| `update.ts` | `PATCH /admin/regions/{id}`. |
| `remove.ts` | `DELETE /admin/regions/{id}`. |
| `options.ts` | Per-field async option search. |

## Gotchas / fragile spots

- Deleting a region may break customer-code and stock-filter joins — backend enforces or warns.

## Up / down

- Parent: [`../CLAUDE.md`](../CLAUDE.md)
- Children: none
- Related repo docs: [`../../../../../frontend_docs/API_LAYER.md`](../../../../../frontend_docs/API_LAYER.md)

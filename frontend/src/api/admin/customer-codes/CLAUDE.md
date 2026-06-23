<!-- dox:child v1 -->
# `frontend/src/api/admin/customer-codes/` — Customer code API

HTTP wrappers for the `/admin/customer-codes` endpoints.

## What lives here

List, CRUD, import, export, and bulk-delete for the West-Central customer master mapping. The natural key is `code + ship_to + region_id`.

## Local conventions

- Import uses a multipart `POST` with an Excel file.
- Export uses raw `fetch` to download a binary `.xlsx`.

## Key files

| File | Role |
|------|------|
| `list.ts` | `GET /admin/customer-codes`. |
| `get.ts` | `GET /admin/customer-codes/{id}`. |
| `create.ts` | `POST /admin/customer-codes`. |
| `update.ts` | `PATCH /admin/customer-codes/{id}`. |
| `remove.ts` | `DELETE /admin/customer-codes/{id}`. |
| `bulk-delete.ts` | `POST /admin/customer-codes/bulk-delete`. |
| `import.ts` | `POST /admin/customer-codes/import` — multipart Excel upload. |
| `export.ts` | `GET /admin/customer-codes/export` — binary download. |
| `template.ts` | `GET /admin/customer-codes/template` — blank import template. |
| `options.ts` | Per-field async option search. |

## Gotchas / fragile spots

- Bulk-delete accepts up to 100 ids and returns the count actually deleted.
- Import summary now reports `updated` rows for re-imports matching the natural key.

## Up / down

- Parent: [`../CLAUDE.md`](../CLAUDE.md)
- Children: none
- Related repo docs: [`../../../../../frontend_docs/API_LAYER.md`](../../../../../frontend_docs/API_LAYER.md)

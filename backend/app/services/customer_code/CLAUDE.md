<!-- dox:child v1 -->
# `backend/app/services/customer_code/` — local rules (dox)

> Local doc for this directory only. Read after the root `CLAUDE.md`. Update this
> file whenever you add, remove, or rename files here, or change a local convention.

## What lives here

Customer-code business logic. Each file is a single use-case service
(create, update, delete, get, list, import, export, options, template, serialize,
region_link). Controllers call these services; no service calls another service
except `region_link` helpers and the shared `audit` event helper.

## Local conventions

- One file per action (`create.py`, `update.py`, `import_rows.py`, etc.).
- Services return public DTOs (`CustomerCodePublic`) or domain result objects
  (`CustomerCodeImportResult`, `CustomerCodeCreateResult`), never raw Beanie docs.
- Upsert semantics are used for both single-record create and bulk import:
  match key is `(code, ship_to, region_id)` case-insensitively, with blank
  `ship_to` normalised to `None`.
- Optional string fields are stored as `None` when blank/whitespace after
  `strip_and_normalize`.
- All DB writes emit an audit event via `audit_customer_code_event`; audit
  failures are swallowed and must never abort the persisted record.

## Key files

| File | Role |
|------|------|
| `create.py` | Upsert a single customer code by natural key; returns `CustomerCodeCreateResult` so the controller can choose "created" vs "updated". |
| `update.py` | Partial PATCH by ObjectId; explicit per-field assignments only. |
| `delete.py` | Hard-delete a single record by ObjectId + audit. |
| `get.py` | Fetch single record by ObjectId. |
| `list.py` | Paginated, sorted, filtered list with `region_name` batch resolution. |
| `import_rows.py` | Bulk import from parsed `.xlsx`; upserts rows and returns inserted/updated/skipped/error counts. |
| `export.py` | Builds an `.xlsx` export of all rows matching the current filters, using the same 15-column template order. Uses the **premium** slate header + zebra styling from `utils/shared/excel_premium`, but **deliberately keeps headers on row 1 with NO title banner** — the export doubles as a re-importable template (+ a hidden fingerprint), and a banner would push headers off row 1 and break re-import. |
| `bulk_delete.py` | Delete up to 100 ``CustomerCode`` documents by ObjectId in one operation. |
| `options.py` | Distinct-value lookup for async-combobox field filters. |
| `template.py` | Builds the blank 15-column import template. |
| `serialize.py` | Maps `CustomerCode` documents to `CustomerCodePublic` DTOs. |
| `region_link.py` | Resolves `region_id` → `Region` and resolves region names. |

## Gotchas / fragile spots

- `CustomerCode` has no uniqueness constraint on `code`; duplicates across
  different `ship_to` values are valid and expected.
- Upsert regex escapes `code` with `re.escape` before anchoring; special chars
  in codes are safe but case-insensitive.
- `_norm_ship_to` treats empty/whitespace as `None`; this is part of the match
  key, so a blank ship-to is a distinct value from a populated one.
- `export.py` ignores pagination and always exports every matching row.
- `export.py` is the **one** premium export that does NOT get a title banner —
  headers must stay on row 1 so the file can be re-imported. Don't add
  `add_title_banner` here.

## Up / down

- Parent: [`../CLAUDE.md`](../CLAUDE.md)
- Children: none
- Related repo docs: [`../../../macro_docs/west-central-customer-codes.md`](../../../macro_docs/west-central-customer-codes.md), [`../../../backend_docs/ADDING_A_DOMAIN.md`](../../../backend_docs/ADDING_A_DOMAIN.md)

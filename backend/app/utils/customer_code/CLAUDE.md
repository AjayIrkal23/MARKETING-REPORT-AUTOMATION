<!-- dox:child v1 -->
# `backend/app/utils/customer_code/` — local rules (dox)

> Local doc for this directory only. Read after the root `CLAUDE.md`. Update this
> file whenever you add, remove, or rename files here, or change a local convention.

## What lives here

Customer-code utilities that have no side-effects and no service dependencies:
Excel parsing/template generation (`excel.py`) and query filter/sort building
(`query.py`).

## Local conventions

- `excel.py` lazily imports `openpyxl` inside each function so `app.main` can
  import cleanly even when `openpyxl` is not installed.
- Header normalization is `strip`, collapse whitespace, lower-case; this makes
  `"CAM "`, `"MOB No."`, etc. equivalent to the canonical map keys.
- Duplicate `"SHIP TO"` / `"SHIP TO CUSTOMER"` columns are resolved by
  occurrence: first → `ship_to` / `ship_to_customer`, second → `ship_to_2` /
  `ship_to_customer_2`.
- Numeric cells (including `float` from `data_only=True`) are coerced to clean
  strings; `40020365.0` becomes `"40020365"`.
- Fully-empty rows are silently skipped. Non-empty rows missing required fields
  have the missing value filled with the string ``"unknown"`` instead of being
  rejected.
- `query.py` escapes all user strings with `re.escape` before embedding them in
  MongoDB `$regex` predicates (ReDoS guard).

## Key files

| File | Role |
|------|------|
| `excel.py` | Header normalization, column→field mapping, workbook parsing, and 15-column template generation. |
| `query.py` | Builds `CustomerCodeListQuery` → MongoDB filter and sort tokens; maps `region` query key to `region_id` DB field. |

## Gotchas / fragile spots

- The updated workbook has two columns named `SHIP TO` and two named
  `SHIP TO CUSTOMER`. The parser relies on occurrence order, not header text
  alone; reordering columns in the template can break import.
- `parse_workbook` buffers the whole sheet in memory; the `MAX_IMPORT_ROWS`
  guard (50 000) is the DoS limit.
- `_count_data_rows` uses `data_only=False` and may disagree with `parse_workbook`
  on malformed files; the import summary uses it only for the skipped-count
  denominator.
- Free-text search `q` covers all 15 text fields; per-field exact filters only
  cover `segment`, `code`, `customer`, `destination`, `cam`, `mob`,
  `ship_to_city`, `rake`, `transport_mode`.

## Up / down

- Parent: [`../CLAUDE.md`](../CLAUDE.md)
- Children: none
- Related repo docs: [`../../../macro_docs/west-central-customer-codes.md`](../../../macro_docs/west-central-customer-codes.md)

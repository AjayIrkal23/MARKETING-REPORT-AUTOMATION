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
- The official import template contains exactly 13 columns and a hidden
  fingerprint sheet named `_JSW_MRA_TEMPLATE_` (`A1=CUSTOMER_CODES_TEMPLATE`,
  `A2=v1`). `parse_workbook` rejects any workbook that lacks the fingerprint,
  contains unknown/extra/duplicate headers, or has columns in the wrong order.
  Missing columns are allowed: absent required columns default to `"unknown"`
  per row; absent optional columns default to `None`.
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
| `excel.py` | Header normalization, column→field mapping, workbook parsing, 13-column template generation, and hidden fingerprint sheet. |
| `query.py` | Builds `CustomerCodeListQuery` → MongoDB filter and sort tokens; maps `region` query key to `region_id` DB field. |

## Gotchas / fragile spots

- The official template is the only accepted import format. Reordered columns,
  extra columns, or missing optional columns all produce a row-0 error.
- `parse_workbook` buffers the whole sheet in memory; the `MAX_IMPORT_ROWS`
  guard (50 000) is the DoS limit.
- `_count_data_rows` uses `data_only=False` and may disagree with `parse_workbook`
  on malformed files; the import summary uses it only for the skipped-count
  denominator.
- Free-text search `q` covers all 13 text fields; per-field exact filters only
  cover `segment`, `code`, `customer`, `destination`, `cam`, `mob`,
  `ship_to_city`, `rake`, `transport_mode`.

## Up / down

- Parent: [`../CLAUDE.md`](../CLAUDE.md)
- Children: none
- Related repo docs: [`../../../macro_docs/west-central-customer-codes.md`](../../../macro_docs/west-central-customer-codes.md)

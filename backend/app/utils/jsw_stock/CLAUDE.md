<!-- dox:child v1 -->
# `backend/app/utils/jsw_stock/` — JSW stock ingest/list helpers

Column mapping, workbook parsing (via the shared format-agnostic parser),
ingestion filtering, and list query building for the JSW stock domain.

## What lives here

Column map, ingestion filters, and the query builder consumed by
`services/jsw_stock/list.py`. Workbook parsing is delegated to
`utils/shared/excel.py` (no openpyxl: the source has malformed numeric cells;
supports xlsx/xlsm/xlsb).

## Local conventions

- `columns.py` is the single source of truth for the 72 source columns, their
  field names, and type tags (`text`, `number`, `date`).
- `excel.py` returns raw row dicts; callers apply `coerce_value()` from
  `columns.py`.
- `filters.py` is pure and transport-free — `customer_map` is resolved once by
  the poller and passed in.

## Key files

| File | Role |
|------|------|
| `__init__.py` | Empty package marker. |
| `columns.py` | 72-column map, header normalization, type coercion. |
| `excel.py` | Thin shim: binds the JSW column map to `utils/shared/excel.parse_workbook` (xlsx/xlsm/xlsb). |
| `filters.py` | `should_keep_row()` ingestion gate. |
| `query.py` | `build_jsw_stock_filter()` and `build_sort()`. |

## Gotchas / fragile spots

- Header spelling in `columns.py` must match the source workbook exactly
  (e.g. `RECIEVING POINT`).
- `lc_exp_date` is intentionally kept as a verbatim string, not a datetime.
- The shared parser clears elements during iterparse to keep memory low for large files.
- `filters.py` gate 5 (NCO) and gate 6 (Usage Decision) are coupled: rows with
  `nco_declared=="Yes"` and a real DO No (`_is_valid_do_no`) set `nco_yes_with_do=True`,
  which causes gate 6 to skip the NCO/COMMERCIAL denylist for those rows. This keeps
  NCO+DO rows in the NCO+DO report bucket. DO No validity: `len > 2` AND not in
  `_NULL_DO_STRINGS` (rejects "NA", "N/A", "none", "nil", etc.).

## Up / down

- Parent: [`../CLAUDE.md`](../CLAUDE.md)
- Children: none
- Related repo docs: [`backend_docs/DATABASE.md`](../../../backend_docs/DATABASE.md) · [`macro_docs/README.md`](../../../../macro_docs/README.md)

<!-- dox:child v1 -->
# `backend/app/utils/jvml_stock/` — JVML stock ingest/list helpers

Column mapping, raw-zip Excel parsing, ingestion filtering, and list query
building for the JVML stock domain.

## What lives here

Parser utilities for `JVML Stock (99).xlsx` plus the query builder consumed by
`services/jvml_stock/list.py`. Mirrors `utils/jsw_stock/`.

## Local conventions

- `columns.py` is the single source of truth for the 72 source columns, their
  field names, and type tags (`text`, `number`, `date`).
- `excel.py` returns raw row dicts; callers apply `coerce_value()` from
  `columns.py`.
- `filters.py` is pure and transport-free.

## Key files

| File | Role |
|------|------|
| `__init__.py` | Empty package marker. |
| `columns.py` | 72-column map, header normalization, type coercion. |
| `excel.py` | Raw-zip `.xlsx` parser using stdlib `zipfile` + `xml.etree`. |
| `filters.py` | `should_keep_row()` ingestion gate. |
| `query.py` | `build_jvml_stock_filter()` and `build_sort()`. |

## Gotchas / fragile spots

- Mirrors `utils/jsw_stock`; keep the two in sync when ingestion rules change.
- Malformed numeric cells are kept verbatim instead of raising.
- `filters.py` NCO+DO logic: see `utils/jsw_stock/CLAUDE.md` — identical rule
  applies here (gate 5/gate 6 coupling via `nco_yes_with_do` flag).

## Up / down

- Parent: [`../CLAUDE.md`](../CLAUDE.md)
- Children: none
- Related repo docs: [`backend_docs/DATABASE.md`](../../../backend_docs/DATABASE.md) · [`macro_docs/README.md`](../../../../macro_docs/README.md)

<!-- dox:child v1 -->
# `backend/app/utils/credit_report/` — local rules (dox)

> Local doc for this directory only. Read after the root `CLAUDE.md`. Update this
> file whenever you add, remove, or rename files here, or change a local convention.

## What lives here

Pure utilities for parsing and filtering the SAP credit-report Excel file
(`macro_files/credit report.XLSX`). These modules are used by the scheduler and
admin endpoints; they do **not** depend on FastAPI request/response types.

## Local conventions

- Keep I/O confined to `parser.py` (raw XLSX zip/XML parsing) and `excel.py`.
- Filtering logic belongs in `filters.py`; query building for MongoDB belongs in
  `query.py`.
- Use `Decimal` for monetary amounts during parsing; cast to `float` before
  persisting via Beanie.
- The parser must tolerate malformed numeric cells (e.g. `"1.057.000"`) without
  crashing; that is why we bypass openpyxl and read the workbook zip/XML directly.

## Key files

| File | Role |
|------|------|
| `parser.py` | Low-level XLSX zip/XML reader that returns raw string rows. |
| `excel.py` | Maps raw rows to `CreditReportCreate` dicts, coerces types, handles dates. |
| `filters.py` | Ingestion-time row gate: keeps rows with a customer name and an allowed CCA. |
| `query.py` | Builds MongoDB filters from `CreditReportListQuery`, including the `plant` filter. |

## Gotchas / fragile spots

- The source workbook cannot be read reliably with openpyxl; do not switch to it
  without verifying malformed-numeric handling.
- `credit_control_area` is compared case-insensitively during ingestion but stored
  as-is from the sheet.
- Open-ended validity dates (`9999-12-31` and other year-9999+ values) are dropped
  by `coerce_value` because the UI does not use them and they break timezone
  conversion during duplicate hashing.
- Adding a new allowed CCA must be reflected in both `filters.py` and `query.py`.

## Up / down

- Parent: [`../CLAUDE.md`](../CLAUDE.md)
- Children: none
- Related repo docs: [`macro_docs/credit-report.md`](../../../../macro_docs/credit-report.md)

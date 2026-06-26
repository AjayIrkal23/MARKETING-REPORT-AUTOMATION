<!-- dox:child v1 -->
# `backend/app/utils/` — local rules (dox)

> Local doc for this directory only. Read after the root `CLAUDE.md`. Update this
> file whenever you add, remove, or rename files here, or change a local convention.

## What lives here

Domain-specific and cross-cutting helper modules that do not depend on the
HTTP/transport layer. Each subdirectory owns one domain concern.

## Local conventions

- Keep utils transport-free and stateless.
- Import ``openpyxl`` / ``pyxlsb`` lazily inside Excel helpers so ``app.main``
  can import without the packages installed (``pyxlsb`` loads only on the
  ``.xlsb`` parse path).
- Every file ≤250 lines; split early.

## Key files

| File | Role |
|------|------|
| `shared/excel.py` | Format-agnostic `parse_workbook` (xlsx/xlsm/xlsb) shared by all report domains. |
| `shared/resolve.py` | `resolve_report_file` — extension-agnostic report-file finder. |
| `shared/excel_premium.py` | Shared **premium** flat-table export engine (`write_flat_table`, `write_records_sheet`, `safe_sheet_name`, `apply_cell_format`). Replaces the removed `export_style.py`; builds on the `utils/report/excel_style.py` primitives. |
| `customer_code/excel.py` | Customer-code template headers, fingerprint, and workbook parser. |
| `customer_code/query.py` | Customer-code filter builder used by list/export services. |

## Gotchas / fragile spots

- Excel utility modules are imported by services that may load before the full
  dependency stack is present; keep ``openpyxl`` / ``pyxlsb`` imports inside functions.

## Up / down

- Parent: [`../CLAUDE.md`](../CLAUDE.md)
- Children: [`shared/`](shared/CLAUDE.md) · [`customer_code/`](customer_code/CLAUDE.md)
- Related repo docs: [`backend_docs/ARCHITECTURE.md`](../../backend_docs/ARCHITECTURE.md)

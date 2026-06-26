<!-- dox:child v1 -->
# `backend/app/utils/shared/` — local rules (dox)

> Local doc for this directory only. Read after the parent `CLAUDE.md`.

## What lives here

Cross-domain Excel helpers: the format-agnostic workbook **parser** + file
**resolver** (ingestion side) and the **premium flat-table export engine**
(export side).

## Local conventions

- `excel.py` is the one workbook parser for all three report domains
  (credit_report, jsw_stock, jvml_stock). It detects the container by **content,
  not extension** and supports `.xlsx` / `.xlsm` (stdlib zip + iterparse) and
  `.xlsb` (pyxlsb). Each `utils/<domain>/excel.py` is a thin shim binding its
  column map: `parse_workbook(data, header_to_field, normalize_header)`.
- `resolve.py` finds a report file from its stem against any Excel extension
  (case-insensitive). It also matches re-download suffixes — `NAME(1)`, `NAME 2`,
  `NAME (3)` (anchored to a numeric suffix, so `NAME SUMMARY` is NOT matched) — and
  returns the **newest** match (mtime; xlsx > xlsm > xlsb breaks ties). Pollers
  import it — do not re-hardcode `.xlsx`.
- Import `openpyxl` / `pyxlsb` lazily inside functions so `app.main` imports
  without them; `pyxlsb` is loaded only on the `.xlsb` path.

## Key files

| File | Role |
|------|------|
| `excel.py` | Format-agnostic `parse_workbook` — content-detecting dispatcher: OOXML (xlsx/xlsm) via stdlib zip+iterparse (malformed-cell tolerant), `.xlsb` via pyxlsb. `.xls`/non-Excel rejected with `ValueError`. |
| `resolve.py` | `resolve_report_file(folder, stem)` — extension-agnostic, **suffix-aware** finder: matches `stem` + browser re-download suffixes (`NAME(1)`/`NAME 2`/`NAME (3)`), newest mtime wins (xlsx/xlsm/xlsb tie-break). `_matches_stem` is the anchored matcher. |
| `excel_premium.py` | The shared **premium** flat-table export engine: `write_flat_table`, `write_records_sheet` (Mongo/pydantic docs → sheet), `safe_sheet_name` (Excel-legal ≤31-char unique names), `apply_cell_format` (kinds: text/num/qty/inr/credit/date/center). The tz-aware-datetime strip lives in `_record_cell` here (no longer in the domain export files). Builds on `utils/report/excel_style.py` primitives; used by stock/credit/customer-code exports + the report rake-breakdown. Replaces the removed `export_style.py`. |

## Gotchas / fragile spots

- `excel.py` does NOT use openpyxl for OOXML — SAP source files have malformed
  numeric cells (`"1.057.000"`) that crash openpyxl; the raw zip parser keeps
  them verbatim.
- `.xlsb` is binary (BIFF12), not zip-of-XML — needs `pyxlsb`. A real `.xlsb`
  can't be generated here (LibreOffice has no xlsb export filter), so the xlsb
  parity test is `skipif`-gated on `tests/fixtures/sample.xlsb`; the xlsb mapping
  path is covered with pyxlsb stubbed.

## Up / down

- Parent: [`../CLAUDE.md`](../CLAUDE.md)
- Children: none

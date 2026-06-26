# Project Linkages — cross-module reference map

Traces each feature across the layers it touches, so a change in one file points
you at the others that must move with it. Per-directory rules live in each
`CLAUDE.md`; deep frontend topics in `frontend_docs/`, backend in `backend/CLAUDE.md`.

---

## Report JSW/JVML (`/report`, non-admin)

A "Coil Stock" RAKE pivot for a date + report type + region, with credit-report
checks. On-demand (Generate button) — the pivot+credit join is heavy.

### Frontend chain

| Layer | File | Role |
|-------|------|------|
| Route | `frontend/src/App.tsx` (`/report`) | `ProtectedRoute` → `ReportPage` |
| Page | `frontend/src/pages/report/index.tsx` | Thin orchestrator; states (idle/loading/no-stock/no-credit) |
| Hook | `frontend/src/components/report/hooks/useReport.ts` | Inputs (date/type/region/days) + `generate`/`exportReport` + `visibleCols`/`toggleCol` |
| Components | `components/report/ReportToolbar.tsx`, `ReportPivotTable.tsx` | Presentational; "Columns" dropdown toggles optional cols; bounded scroll box |
| Format/registry | `components/report/report-format.ts` | INR/qty formatters + optional-column registry (`REPORT_OPTIONAL_COLS`) |
| API | `frontend/src/api/report/generate.ts`, `export.ts` | `GET /report/generate`, `GET /report/export` |
| Types | `frontend/src/types/report/report.ts` | Mirror of backend `schemas/report.py` |
| Layout | `components/layout/DashboardLayout.tsx` | `min-w-0` so wide tables scroll inside their box (see `frontend_docs/COMPONENTS.md`) |
| Primitive | `components/ui/table.tsx` | `containerClassName` passthrough enables the bounded scroll box |

### Backend chain

| Layer | File | Role |
|-------|------|------|
| Route | `backend/app/routes/report.py` | `GET /report/generate`, `GET /report/export` (auth: `get_current_user`) |
| Controller | `backend/app/controllers/report.py` | Thin; 4-key unknown-param rejection; envelope |
| Service | `backend/app/services/report/generate.py` | Orchestrator: region→codes→pivot→credit→assemble; `_filter_used_rakes` drops empty RAKE columns |
| Service | `backend/app/services/report/pivot.py` | Mongo `$group` aggregation + QA-hold aging filter |
| Service | `backend/app/services/report/credit.py` | Credit-map lookup + coil price-per-qty |
| Service | `backend/app/services/report/export.py` | Styled .xlsx (mirrors the table; no SO Sales Org column) |
| Schema | `backend/app/schemas/report.py` | `ReportQuery` / `ReportPivotRow` / `ReportResponse` DTOs |
| Models | `models/{jsw_stock,jvml_stock,customer_code,credit_report,coil_price}.py` | Data sources |
| Tests | `backend/tests/test_report_{enrichment,export}.py` | Pivot enrichment, RAKE filter, xlsx export |

### Change-impact notes

- **Add/rename a column key** → `report-format.ts` (`REPORT_OPTIONAL_COLS` + `ReportColKey`) **and** the
  `trailingBodyCell`/`trailingFooterCell` switches in `ReportPivotTable.tsx`.
- **RAKE columns** are filtered server-side (`generate.py::_filter_used_rakes`); the response's
  `rake_columns` is already trimmed — never hard-code RAKEs on the client.
- **`so_sales_org`** is grouped/sorted on and returned in the payload, but is intentionally not rendered
  in the table nor written to the export. Don't re-add to one without the other.
- The DTOs in `schemas/report.py` and `types/report/report.ts` are a manual mirror — change them together.

---

## Report ingestion config + format-agnostic parsing (Settings, admin)

The three scheduler config cards (JSW / JVML / Credit) store a base path + a file
**stem** (no extension). The poller resolves the stem against any Excel extension and
the parser detects the container by content, so `.xlsx` / `.xlsm` / `.xlsb` all ingest.

| Layer | File | Role |
|-------|------|------|
| Settings UI | `frontend/src/components/settings/{StockConfigPanel,ResolvedPathPreview}.tsx`, `config-domains.ts` | File name = stem only; UI shows `.xlsx / .xlsm / .xlsb` auto-detected (no fixed `.xlsx`) |
| Resolver | `backend/app/utils/shared/resolve.py` | `resolve_report_file(folder, stem)` → xlsx > xlsm > xlsb |
| Parser | `backend/app/utils/shared/excel.py` | content-detecting `parse_workbook`; OOXML raw-zip + `.xlsb` via pyxlsb |
| Domain shims | `backend/app/utils/{jsw_stock,jvml_stock,credit_report}/excel.py` | bind the column map → shared parser |
| Pollers | `backend/app/services/{jsw_stock,jvml_stock}/poller.py`, `credit_report/zone_polling.py` | use the shared resolver |
| Tests | `backend/tests/test_shared_{excel,resolve}.py` | parser dispatch + resolver priority |

### Change-impact notes

- **Add/drop a supported format** → edit `utils/shared/excel.py` (dispatch) and
  `resolve.py::EXCEL_EXTS`, then mirror the extension list in the FE copy
  (`config-domains.ts` hints + `ResolvedPathPreview.tsx`).
- The settings **File name** field is a *stem* — never show or require a fixed
  extension in the UI.
- `.xlsb` is binary (parsed via pyxlsb); `.xls` (OLE2) is intentionally unsupported.

---

## RAKE drill-down exclusions (browser-only, session-only)

In the Report's "Total Rake Report" tab, a user can uncheck drill-down rows. Those
rows are subtracted from the RAKE total, the Transport Mode total, and the drill-down
footer (live, client-side) and omitted from the export's rake-totals / transport-mode
/ breakdown sheets. Nothing is persisted; state clears on `generate()`.

| Layer | File | Role |
|-------|------|------|
| Identity (shared contract) | `frontend/src/components/report/rake-exclusions.ts::rowKey` ⇄ `backend/app/services/report/rake_drilldown.py::row_identity` | 8-field merge key joined by `chr(31)` — **must match byte-for-byte** |
| State | `frontend/src/components/report/hooks/useReport.ts` | `exclusions` (plain `useState`, not persisted) + `toggleExclusion`; cleared in `generate()`; folded into the export body |
| UI — checkboxes | `frontend/src/components/report/RakeDrilldownTable.tsx` | Incl. column; footer = Σ checked rows |
| UI — totals | `frontend/src/components/report/RakeTotalsTab.tsx` | RAKE + Transport Mode tables subtract via `subtractFor` / `transportSubtract` |
| Toggle wiring | `frontend/src/components/report/ReportSection.tsx` | computes `matchInfoFor` (stock-scoped qty + transport mode) from drill-down rows |
| Export API | `frontend/src/api/report/export.ts`, `frontend/src/types/report/report.ts` | `GET → POST` with `{exclusions, transport_subtract}` when any row is unchecked |
| Export schema | `backend/app/schemas/report.py` | `RakeExclusion`, `CombinedExportBody` |
| Export service | `backend/app/services/report/{export_combined,rake_breakdown_export}.py` | subtract totals (clamped ≥0); drop rows + recompute breakdown sheet totals; emit "TRANSPORT MODE TOTAL" sheet |
| Route/controller | `backend/app/routes/report.py`, `backend/app/controllers/report.py` | `/report/export-combined` now `GET\|POST`; optional `CombinedExportBody` |
| Tests | `backend/tests/test_report_export_combined.py`, `test_report_export_route.py` | exclusion subtraction/omission + GET/POST body binding |

### Change-impact notes

- **Never diverge the identity contract** — change the separator (`chr(31)`) or the
  8 fields/order in `rake-exclusions.ts` and `rake_drilldown.py` together, or unchecked
  rows silently stop dropping from the export.
- Single jsw/jvml mode: the drill-down is a union superset, so totals subtraction is
  **stock-type-scoped** (`matchInfoFor`) — an other-stock row subtracts 0 but is still
  dropped from the breakdown sheet. `both` mode is exact.
- Transport-mode buckets map empty → `"Unknown"` to match `generate.py::_compute_totals`.
- Browser-only: exclusions live in `useReport` `useState` (never persisted), clear on
  `generate()` **and on any toolbar input change** (so a stale export can't apply old
  unchecks to a regenerated report), and ride the export as a transient POST body —
  no DB, no shared state.

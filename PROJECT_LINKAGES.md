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

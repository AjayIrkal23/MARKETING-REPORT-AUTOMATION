<!-- dox:child v1 -->
# `frontend/src/types/report/` — Report domain types

TypeScript types for the Report JSW/JVML feature.

## What lives here

Contains the query params, response payload, and row/column types for the RAKE pivot report.

## Local conventions

- RAKE columns are dynamic and come from the backend response.
- Optional column keys are whitelisted in the frontend registry.

## Key files

| File | Role |
|------|------|
| `report.ts` | Report query, response, and row types, plus the export-picker types: `ExportSheetKey` (union: `pivot` \| `rake_totals` \| `rake_merged` \| `rake_unmerged` \| `jsw` \| `jvml` \| `credit`) and `CombinedExportParams` (`ReportQueryParams` + `sheets`). |

## Gotchas / fragile spots

- The pivot relies on backend sort order — client-side grouping assumes contiguous rows.

## Up / down

- Parent: [`../CLAUDE.md`](../CLAUDE.md)
- Children: none
- Related repo docs: [`../../../../frontend_docs/TYPES.md`](../../../../frontend_docs/TYPES.md)

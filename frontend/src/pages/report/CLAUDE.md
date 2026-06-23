<!-- dox:child v1 -->
# `frontend/src/pages/report/` — local rules (dox)

> Local doc for this directory only. Read after the root `CLAUDE.md`. Update this
> file whenever you add, remove, or rename files here, or change a local convention.

## What lives here

`index.tsx` — the **Report JSW/JVML** page (`/report`, ProtectedRoute, all
authenticated users). Thin orchestrator only.

## Local conventions

- Zero business logic. The page pulls everything from `useReport()`
  (`components/report/hooks/useReport.ts`) and renders: header → `ReportToolbar`
  → states (idle / loading / no-stock / no-credit banner) → `ReportPivotTable`.
- Thread `visibleCols` + `toggleCol` to **both** `ReportToolbar` (the Columns
  dropdown) and `ReportPivotTable` (which columns to render).

## Key files

| File | Role |
|------|------|
| `index.tsx` | Page orchestrator; empty/loading/no-stock/no-credit states |

## Gotchas / fragile spots

- The report is fetched **on demand** (`Generate` button), not reactively — the
  pivot+credit join is heavy. Don't auto-fetch on input change.
- `has_stock=false` → "No stock excel for this date selected" panel;
  `has_credit_report=false` → amber banner + credit cells show "NO CREDIT REPORT
  FOUND". Both booleans are decided backend-side.

## Up / down

- Parent: [`../CLAUDE.md`](../CLAUDE.md)
- Children: none
- Related repo docs: `components/report/CLAUDE.md`; backend `app/services/report/CLAUDE.md`

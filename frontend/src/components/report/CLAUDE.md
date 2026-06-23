<!-- dox:child v1 -->
# `frontend/src/components/report/` — local rules (dox)

> Local doc for this directory only. Read after the root `CLAUDE.md`. Update this
> file whenever you add, remove, or rename files here, or change a local convention.

## What lives here

The **Report JSW/JVML** feature UI (`/report`, non-admin): a "Coil Stock" RAKE
pivot with credit-report checks. Presentational components + the feature hook;
no API calls live here (those are in `src/api/report/`).

## Local conventions

- `ReportToolbar` and `ReportPivotTable` are **purely presentational** — all
  state lives in `hooks/useReport.ts`. The page (`pages/report/index.tsx`) wires
  them together.
- Display formatting (`fmtQty`, `fmtINR`, `signClass`) and the optional-column
  registry (`REPORT_OPTIONAL_COLS`, `DEFAULT_REPORT_COLS`, `ReportColKey`) live in
  `report-format.ts` — the single shared module imported by the toolbar, table,
  and hook. Don't duplicate column keys/labels anywhere else.
- **No client-side filtering of server data.** The only client-side view config
  is column *visibility* (the toolbar "Columns" dropdown → `visibleCols`), which
  is presentation, not row filtering.

## Key files

| File | Role |
|------|------|
| `hooks/useReport.ts` | All page state: 4 inputs (date/type/region/days), `generate()`/`exportReport()`, and `visibleCols`/`toggleCol` for optional columns |
| `ReportToolbar.tsx` | Date · JSW/JVML toggle · region combobox · **Columns** dropdown (checkbox toggles, next to region) · days select · Generate · Export |
| `ReportPivotTable.tsx` | The pivot table: fixed cols + dynamic RAKE cols + Total + optional trailing cols; bounded scroll box with sticky header + sticky grand-total footer |
| `report-format.ts` | INR/qty formatters, sign colouring, and the optional-column registry/types |

## Gotchas / fragile spots

- **SO Sales Org is not shown** here (it is still in the API payload, used for
  backend grouping/sort). Don't re-add it to the table without a reason.
- **RAKE columns come pre-filtered from the backend** (`rake_columns` already
  excludes all-zero RAKEs). Render columns from `report.rake_columns`, never a
  hard-coded list, and read values from `row.rake_quantities[col]`.
- The table scrolls inside its own box via `Table containerClassName="max-h-…
  overflow-auto"` (the `containerClassName` prop was added to
  `components/ui/table.tsx`). Sticky header/footer cells need an **opaque** bg
  (`bg-background` / `bg-muted`) or scrolled rows bleed through. The page-level
  sideways-scroll fix is `min-w-0` on `SidebarInset`+`<main>` in
  `DashboardLayout.tsx` — see CODEX "Known Fragile Areas".
- Optional columns: adding one = extend `REPORT_OPTIONAL_COLS` + `ReportColKey`
  in `report-format.ts`, then add a `case` in `ReportPivotTable`'s
  `trailingBodyCell`/`trailingFooterCell`. Default visibility is in
  `DEFAULT_REPORT_COLS`.

## Up / down

- Parent: [`../CLAUDE.md`](../CLAUDE.md)
- Children: [`hooks/`](hooks/CLAUDE.md)
- Related repo docs: backend `app/services/report/CLAUDE.md`; CODEX.md §Known Fragile Areas

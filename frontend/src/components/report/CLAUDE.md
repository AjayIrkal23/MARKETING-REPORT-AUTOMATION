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
  and hook. Don't duplicate column keys/labels anywhere else. Each optional col
  carries a `side`: `"detail"` (left columns — Transport Mode / Destination /
  ROUTE), `"rake"` (one switch for the whole dynamic RAKE block — key `rake`,
  label "RAKE columns"), or `"credit"` (trailing columns after the RAKE cols —
  **Total**, Yes+DO, Blocked, Credit Balance, Required Credit, Credit Note).
  **10 toggles total; Total and the RAKE block are optional too** — only the 5
  fixed left cols are always shown. The table reads
  `const rakeCols = visibleCols.rake ? report.rake_columns : []` and maps that at
  all 4 sites, so unchecking "RAKE columns" hides the whole block at once.
- **Export is a two-step sheet picker → combined download.** The toolbar Export
  button calls `useReport.openExportDialog()`, which opens `ExportSheetsDialog`;
  confirming runs `confirmExport(sheets)` → `exportCombined()` (`GET
  /report/export-combined`). The chosen `sheets` CSV picks the workbook sheets
  (pivot / rake totals / per-rake merged+unmerged / jsw / jvml / credit); the pivot
  sheet still honours the on-screen optional-column toggles via a `columns` CSV
  (absent ⇒ all columns; empty ⇒ none). JSW/JVML sheet options appear only when
  `report_type` includes them.
- **No client-side filtering of server data.** The only client-side view config
  is column *visibility* (the toolbar "Columns" dropdown → `visibleCols`) and the
  pivot *grouping/subtotals* (`buildRenderRows`) — both are presentation derived
  from already-fetched rows, not row filtering. Rows arrive pre-sorted by the full
  hierarchy tuple from the backend (`services/report/generate.py::_ROW_SORT_KEYS`),
  which is what makes contiguous client-side grouping safe.

## Key files

| File | Role |
|------|------|
| `hooks/useReport.ts` | All page state: 4 inputs (date/type/region/days; `report_type` is `jsw\|jvml\|both`), `generate()`, the **two-step export** (`openExportDialog()` → `confirmExport(sheets)`, plus `exportDialogOpen`/`setExportDialogOpen`), and `visibleCols`/`toggleCol`. **`both` is ONE call** — the backend merges jsw + jvml into a single `data: ReportResponse` (`report_type:"both"`); no client-side fan-out |
| `ExportSheetsDialog.tsx` | The Export **sheet-picker** modal: an icon + checkbox row per sheet option (Branch Wise Pivot Report, Total Rake Report, Rake Breakdown Merged, Rake Breakdown Unmerged, JSW Stock List, JVML Stock List, Credit Report). JSW/JVML rows show only when `report_type` includes them (jsw→JSW, jvml→JVML, both→both); defaults to all visible options selected; confirms the picked keys (canonical sheet order) to `useReport.confirmExport` |
| `ReportToolbar.tsx` | Date · **JSW / JVML / Both** segmented toggle · region combobox · **Columns** dropdown (Detail + RAKE + Credit groups) · days select · Generate · Export (opens `ExportSheetsDialog` via `openExportDialog`) |
| `ReportSection.tsx` | Renders the report block (summary line + no-stock/no-credit states + `ReportPivotTable`). One section always — `both` is a single merged response, so `groupBySoOrg` just switches the table layout (no second table). **Owns the RAKE drill-down**: holds `useRakeDrilldown` + the `mode` (Merged/Unmerged) state and renders the drill-down controls (Back · RAKE title · toggle) on the **same row as the tab switcher** (`flex justify-between`), not stacked below |
| `ReportPivotTable.tsx` | The grouped pivot: fixed left cols (repeated parents blanked) + optional Detail cols + dynamic RAKE + Total + optional Credit cols; bounded scroll box with sticky header + grand-total footer. **Fixed-col order: Distr. Channel → BRANCH → Sold To Party → Party Code → Ship To Party** — BRANCH (`sales_office`) is the grouped pivot column right after Distr. Channel so each unique branch heads its items. **`groupBySoOrg` prop** (Both mode) prepends an **SO Sales Org** column and subtotals per SO Sales Org instead of Distr.Channel |
| `report-grouping.ts` | Pure `buildRenderRows(rows, groupBy)` — walks the pre-sorted rows into data rows (with group-first flags) + bottom-of-group subtotals (summing RAKE/Total/Yes+DO/Required Credit). `groupBy` = `"distr_chnl"` (default, single) or `"so_sales_org"` (Both, SO Sales Org leads the blankable chain). No Party Code subtotal — group + grand totals are enough |
| `report-cells.tsx` | Trailing credit/total cell builders (`trailingBodyCell`, `aggTrailingCell`, `TRAILING_META`) — split out to keep the table ≤250 lines |
| `report-format.ts` | INR/qty formatters, sign colouring, and the side-aware optional-column registry/types |
| `RakeTotalsTab.tsx` | The "Total Rake Report" tab: RAKE totals + Transport-mode totals, each a **full-width stacked row** (`flex flex-col gap-6`, not the old side-by-side grid). **RAKE rows are clickable** → calls the `onRakeClick` prop; the drill-down state + the Back/RAKE/toggle controls now live in `ReportSection` (on the tab-bar row), not here. **No export button** — RAKE totals are now one selectable sheet in the combined export (the `ExportSheetsDialog` picker), not a standalone download |
| `RakeDrilldownTable.tsx` | Controlled drill-down **body (table only)** for one RAKE — individual jsw + jvml stock rows (Source · Sales Org · Distr Channel · BRANCH · Sold To Party · Party Code · Ship To Party · Transport Mode · Destination · Customer · Qty) + total footer + loading/error/empty states. **No header here** — Back · RAKE title · the **Merged Data / Data not Merged** toggle + the `mode` state live in `ReportSection` (tab-bar row); `mode` arrives as a **prop**. Merged renders the **server-computed** `data.merged_rows` (9 cols, drops Source + Ship To Party), unmerged renders `data.rows` (11 cols); one generic table driven by `COLS_RAW`(11)/`COLS_MERGED`(9). Footer Total = `total_quantity` (merge-invariant) in both modes; toggling **never refetches** (both row sets ride in one payload). The merge lives in the backend (`rake_drilldown.py::_merge_rows`), not here. shadcn `Table` (own scroll box via `containerClassName`) |

## Gotchas / fragile spots

- **SO Sales Org is shown only in Both mode** (`groupBySoOrg`) — single JSW/JVML
  hides it (used only for backend grouping/sort) and subtotals by Distr.Channel.
  **Both is ONE merged table** (the backend joins jsw + jvml in `generate_report`
  and returns `report_type:"both"`), grouped/subtotaled by SO Sales Org — JSW orgs
  and JVML orgs differ, so they naturally fall into separate SO-Org groups in the
  same table. Don't add SO Sales Org to the single-mode table without a reason.
- **RAKE columns come pre-filtered from the backend** (`rake_columns` already
  excludes all-zero RAKEs). Render columns from `report.rake_columns`, never a
  hard-coded list, and read values from `row.rake_quantities[col]`.
- The table scrolls inside its own box via `Table containerClassName="max-h-…
  overflow-auto"` (the `containerClassName` prop was added to
  `components/ui/table.tsx`). Sticky header/footer cells need an **opaque** bg
  (`bg-background` / `bg-muted`) or scrolled rows bleed through. The page-level
  sideways-scroll fix is `min-w-0` on `SidebarInset`+`<main>` in
  `DashboardLayout.tsx` — see CODEX "Known Fragile Areas".
- Optional columns: adding one = extend `REPORT_OPTIONAL_COLS` (with its `side`) +
  the matching `ReportDetailColKey`/`ReportCreditColKey` in `report-format.ts`, then
  for a **credit** col add a `case` in `report-cells.tsx`'s `trailingBodyCell`
  (and `aggTrailingCell` if it should sum); for a **detail** col add an entry to
  `DETAIL_META` in `ReportPivotTable.tsx`. Default visibility is in
  `DEFAULT_REPORT_COLS`.
- **Grouping relies on backend sort order.** `buildRenderRows` detects group
  boundaries by comparing adjacent rows, so it only works because rows are
  contiguous by the hierarchy. If the backend sort ever changes, subtotals will
  fragment — re-sort client-side or fix the backend, don't patch the walker.
- Subtotal rows reuse `aggTrailingCell`; the grand-total footer feeds it a
  synthetic agg built from `grand_total`/`grand_nco_yes_do`/`grand_required_credit`.

## Up / down

- Parent: [`../CLAUDE.md`](../CLAUDE.md)
- Children: [`hooks/`](hooks/CLAUDE.md)
- Related repo docs: backend `app/services/report/CLAUDE.md`; CODEX.md §Known Fragile Areas

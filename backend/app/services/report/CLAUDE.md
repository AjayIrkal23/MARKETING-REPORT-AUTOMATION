<!-- dox:child v1 -->
# `backend/app/services/report/` — local rules (dox)

> Local doc for this directory only. Read after the root `CLAUDE.md`. Update this
> file whenever you add, remove, or rename files here, or change a local convention.

## What lives here

JSW/JVML "Coil Stock" RAKE-pivot + credit-report orchestration. Files build the
`GET /report/generate` payload: stock aggregation, CustomerCode enrichment,
RAKE-column pivot, credit augmentation, and final assembly. The export side is
now a set of **sheet writers** assembled into ONE multi-sheet workbook by
`export_combined.py` (backs `GET /report/export-combined`); there is no longer a
standalone pivot or rake-totals export endpoint.

## Local conventions

- Keep all MongoDB aggregation logic in `pivot.py`; business decisions about
  credit status/blocked belong in `generate.py`.
- **Row display/group order** is set by `_ROW_SORT_KEYS` in `generate.py`:
  `so_sales_org → distr_chnl → sales_office (BRANCH) → sold_to_party → party_code
  → ship_to_party → …`. BRANCH sits right after Distr. Channel — a grouped pivot
  column heading its items, above Sold To Party. The `$group` `_id` key order in
  `pivot.py` does **not** affect grouping; only this tuple does. `export.py`
  (`_FIXED_HEADERS`/`_BLANK_KEYS`/`_fixed_cells`) and the frontend
  (`report-grouping.ts::FIXED_COL_KEYS`) must mirror this order.
- `ReportPivotRow` columns come from two sources:
  - Stock row fields (`so_sales_org`, `distr_chnl`, `sold_to_party`,
    `sales_office`, `party_code`, `ship_to_party`) are populated in the `$group`
    stage.
  - CustomerCode master fields (`transport_mode`, `destination`, `route`, `rake`)
    are resolved in `_resolve_region_customers` and merged in `_build_pivot_rows`.
- `rake_quantities` is a dict mapping each unique RAKE value for the selected
  region to the row's summed stock quantity; only the RAKE of the first matching
  CustomerCode document per normalized party code receives the total.

## Key files

| File | Role |
|------|------|
| `generate.py` | Region → customer codes → pivot → credit → `ReportResponse`. `report_type="both"` runs `_generate_single("jsw")` + `_generate_single("jvml")` and `_merge_reports()` them into one payload (rows re-sorted by `_ROW_SORT_KEYS` → grouped by SO Sales Org; union `rake_columns`; summed grands; concatenated `ccas`) |
| `pivot.py` | MongoDB `$group` aggregation for the row fields |
| `rake_drilldown.py` | Reverse-resolves ONE RAKE → its individual jsw + jvml stock rows (NOT aggregated). Reuses `_resolve_region_customers` + `_strip_or_none` (from `generate.py`) and `qa_hold_match` (from `pivot.py`). Filters region codes to those whose **first-doc** RAKE matches (same first-doc-wins mapping the report uses), then queries **BOTH** `JswStock` + `JvmlStock` — **always union, independent of `report_type`** (per product requirement: complete cross-stock customer list for the RAKE). ⇒ in `both` mode the summed qty == the report's RAKE total; in single `jsw`/`jvml` mode it's a **superset** (also includes the other stock). transport_mode/destination come from `CustomerCode` (not the stock row). Also returns **`merged_rows`** — `_merge_rows()` collapses rows sharing an 8-field identity (so_sales_org · distr_chnl · sales_office · sold_to_party · party_code · transport_mode · destination · customer_name), summing qty and **dropping Source + Ship To Party** (not in the key); Σ merged_rows == Σ rows == total_quantity (3dp). Backs `GET /report/rake-drilldown`. Also exposes **`row_identity(row)`** — the canonical 8-field key string (fields joined by `chr(31)`; `None`→`""`) used by the export to match browser-unchecked rows; **mirrored byte-for-byte** by the frontend `rake-exclusions.ts::rowKey` (separator `String.fromCharCode(31)`) |
| `credit.py` | Credit-report lookup + required-credit calculation |
| `export.py` | `write_pivot_sheet(wb, report, visible, sheet_title)` — writes ONE **grouped** .xlsx pivot sheet into a workbook: repeated parent cells blanked + per-group subtotal rows + Grand Total (no Party Code subtotal). Single mode groups by Distr.Channel (`{channel} Total`); **`both` leads with an SO Sales Org column and groups by SO Sales Org (`{org} Total`)** via a `group_by_so` branch threaded through the helpers. Honours the `ReportQuery.columns` CSV filter (3 detail + the **`rake`** block + 6 trailing incl. **Total**); only the fixed cols are always written. The whole dynamic RAKE block shares one `"rake"` key in `_kept_indices` — absent from `columns` ⇒ the block is dropped. `columns=None` ⇒ all; `""` ⇒ none. The standalone `export_report` + `GET /report/export` endpoint were **removed** — `export_combined.py` owns the pivot now |
| `export_totals.py` | `write_totals_sheet(wb, *, sheet_title, table_header, rows, subtitle)` — writes the "TOTAL RAKE REPORT" RAKE-totals sheet. The old standalone `export_rake_totals` + `GET /report/export-rake-totals` endpoint were **removed** |
| `rake_breakdown_export.py` | `write_rake_breakdown_sheets(wb, query, *, merged, unmerged, exclusions=None)` — enumerates the region's unique rakes, runs the existing `rake_drilldown` per rake (cached), writes all "{RAKE} - Total Rake Wise" sheets (merged rows) first then all "{RAKE} - Batch Rake Wise" (raw rows); an empty rake still gets a sheet with a "(no rows)" note. `exclusions` (RAKE → set of `row_identity` keys) drops user-unchecked rows via `_keep()` and **recomputes** each sheet's Total from the survivors (never reuses `result.total_quantity`) |
| `export_combined.py` | `export_combined(query: CombinedExportQuery, body: CombinedExportBody \| None = None) -> bytes` — builds ONE workbook from the chosen `sheets` set: `pivot`→"BRANCH WISE PIVOT REPORT", `rake_totals`→"TOTAL RAKE REPORT" **+ "TRANSPORT MODE TOTAL"** (two sheets under the one pick, mirroring the on-screen tab), `rake_merged`/`rake_unmerged`→per-rake sheets, `jsw`→"JSW Stock", `jvml`→"JVML Stock", `credit`→"Credit Report", plus a "Metadata" sheet. Sheet order = pivot, rake total, transport-mode total, all merged, all unmerged, jsw, jvml, credit. Validates the sheets CSV (unknown/empty → `ValidationError`). **Optional `body`** carries browser-only exclusions: per-rake `subtract` is removed from the RAKE totals, `transport_subtract` from the transport-mode totals (both clamped ≥0), and the `keys` set is threaded to the breakdown writer. Backs `GET\|POST /report/export-combined` |

## Gotchas / fragile spots

- **`export.py::write_pivot_sheet` grouping mirrors the frontend `report-grouping.ts`
  walker** and depends on the same `_ROW_SORT_KEYS` ordering from `generate.py` (rows
  must stay contiguous by the hierarchy, or subtotals fragment). The `{channel} Total` label
  sits in the Distr.Channel column; Party Code groups get no subtotal. Credit money
  (Balance, Blocked, Note) is intentionally blank on subtotal/grand rows.
- `CustomerCode.code` is not unique. First document per normalized code wins
  for enrichment and RAKE assignment.
- The pivot uses `party_code_normalized` (leading zeros stripped). The report
  region filter restricts to codes belonging to the selected region.
- RAKE columns are dynamic: the response includes the sorted list of unique
  `CustomerCode.rake` values, so the frontend must render columns from
  `rake_columns`, not a hard-coded list.
- **RAKE columns are filtered to non-empty.** After `_build_pivot_rows`,
  `generate_report` calls `_filter_used_rakes(rows, rake_columns)` to drop every
  RAKE column that is all-zero for the chosen date and prune each row's
  `rake_quantities` to the survivors — so `rake_columns` is already trimmed and
  the table/export/payload only carry RAKEs that actually moved stock. This is a
  business view rule, so it lives in the service, not the client.
- **`so_sales_org` column: hidden in single mode, shown in `both`.** Single
  jsw/jvml groups/sorts by `so_sales_org` but does **not** render it (not in
  `_FIXED_HEADERS`, not in the frontend table). `report_type="both"` prepends it as
  the leading column AND uses it as the group key (`group_by_so`), in both the
  export and the frontend table. If you add it to single-mode headers, add the row
  value too.
- **`both` merge invariants** (`generate.py::_merge_reports`): rows keep each
  sub-report's own credit columns + RAKE quantities; `rake_columns` is the sorted
  union (a row missing the other report's RAKE renders "—"/blank, sums stay
  per-column correct); `has_credit_report = all(parts)` (so the banner over-warns if
  only one type lacks a credit report — rows are still per-type accurate);
  `coil_price_per_qty` is shared. Re-sort by `_ROW_SORT_KEYS` keeps SO-org groups
  contiguous for both the export walker and the client walker.

- **`nco_yes_do` pivot condition requires DO No.** `pivot.py::aggregate_pivot` uses
  `is_nco_yes_with_do` (`nco_declared=="Yes"` AND `strLenCP(do_no) > 2`) so only rows
  with a real delivery-order number count toward the NCO+DO bucket. This guards against
  old data ingested before the gate-5/gate-6 fix (2026-06-25).

- **Browser-only RAKE exclusions (export side).** The `/report` page lets a user uncheck
  drill-down rows; those are subtracted on-screen AND sent (transient, never persisted) as
  the `CombinedExportBody` POST body so the rake_totals + transport-mode + breakdown sheets
  match. Matching is by `row_identity` (the 8-field merge key) — the **separator (`chr(31)`)
  and field order MUST stay identical** to the frontend `rake-exclusions.ts`, or unchecked
  rows silently fail to drop. Totals subtraction trusts the client-sent `subtract` /
  `transport_subtract` (it's the user's own report, not a security boundary) to avoid
  re-deriving the stock-type-scoped qty in Python. Pivot / jsw / jvml / credit sheets ignore
  exclusions entirely. Single jsw/jvml mode: only same-stock rows reduce a total (the
  drill-down is a union superset), so a `subtract` of 0 is normal and still drops the row
  from the breakdown sheet.

## Up / down

- Parent: [`../CLAUDE.md`](../CLAUDE.md)
- Children: none
- Related repo docs: [`CODEX.md`](../../../../../CODEX.md) §Architecture Decisions

<!-- dox:child v1 -->
# `backend/app/services/report/` — local rules (dox)

> Local doc for this directory only. Read after the root `CLAUDE.md`. Update this
> file whenever you add, remove, or rename files here, or change a local convention.

## What lives here

JSW/JVML "Coil Stock" RAKE-pivot + credit-report orchestration. Files build the
`GET /report/generate` payload: stock aggregation, CustomerCode enrichment,
RAKE-column pivot, credit augmentation, and final assembly.

## Local conventions

- Keep all MongoDB aggregation logic in `pivot.py`; business decisions about
  credit status/blocked belong in `generate.py`.
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
| `credit.py` | Credit-report lookup + required-credit calculation |
| `export.py` | Export the report as a **grouped** .xlsx pivot — repeated parent cells blanked + per-group subtotal rows + Grand Total (no Party Code subtotal). Single mode groups by Distr.Channel (`{channel} Total`); **`both` leads with an SO Sales Org column and groups by SO Sales Org (`{org} Total`)** via a `group_by_so` branch threaded through the helpers. Honours the `ReportQuery.columns` CSV filter (3 detail + 6 trailing incl. **Total**); the fixed cols + RAKE are always written. `columns=None` ⇒ all; `""` ⇒ none |

## Gotchas / fragile spots

- **`export.py` grouping mirrors the frontend `report-grouping.ts` walker** and
  depends on the same `_ROW_SORT_KEYS` ordering from `generate.py` (rows must stay
  contiguous by the hierarchy, or subtotals fragment). The `{channel} Total` label
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

## Up / down

- Parent: [`../CLAUDE.md`](../CLAUDE.md)
- Children: none
- Related repo docs: [`CODEX.md`](../../../../../CODEX.md) §Architecture Decisions

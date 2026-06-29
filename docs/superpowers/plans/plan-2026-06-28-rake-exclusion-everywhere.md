# Action Plan — RAKE exclusion applies everywhere (pivot + jsw/jvml export), live

**Date:** 2026-06-28
**Audits:** [`audit-rake-exclusion-backend.md`](../specs/audit-rake-exclusion-backend.md) · [`audit-rake-exclusion-frontend.md`](../specs/audit-rake-exclusion-frontend.md)

## Goal

Today, unchecking a RAKE drill-down row only subtracts from **rake totals +
transport-mode totals + drill-down footer + the rake breakdown (Total/Batch Rake
Wise) sheets**. Extend it so an unchecked drill-down identity is also removed
from:

- **Pivot** — on-screen ("Branch Wise Report") **and** the export pivot sheet.
- **JSW Stock** export sheet.
- **JVML Stock** export sheet.

…and the on-screen pivot updates **live** after the report is generated (no
re-generate).

## Confirmed product decisions (user, 2026-06-28)

1. **JSW/JVML = export sheets only.** There are no JSW/JVML lists on the `/report`
   screen (the page has only Pivot + Rake Totals views). So exclusion affects the
   JSW/JVML **export sheets** only; the only new **live UI** surface is the Pivot.
2. **Live update for the pivot.** Asked for "debounced backend recompute"; the
   audits showed a strictly-better path: add the one missing field
   (`customer_name`) to the pivot row so the existing 8-field identity works on
   pivot rows. The pivot can then be netted **client-side, instantly** — no
   round-trip, no debounce, no new endpoint — and the same identity nets the
   export server-side. Consistent with the rake/transport/footer subtraction that
   is **already** client-side. (We deliver the requested live behavior, better.)

## The keystone

The browser-only exclusion is a set of canonical **8-field identity** strings
(`so_sales_org · distr_chnl · sales_office · sold_to_party · party_code ·
transport_mode · destination · customer_name`, `chr(31)`-joined). Backend
`row_identity()` and frontend `rowKey()` already produce it byte-for-byte.

The only blocker to applying it to the pivot was: **`ReportPivotRow` lacks
`customer_name`** (the pivot `$group` never carried it). Add that one field →
`row_identity(pivot_row)` works directly, on both sides. `transport_mode` /
`destination` already agree (both pivot and drill-down derive them from the same
`CustomerCode` first-doc map). `ship_to_party` is intentionally not in the key,
so one identity removes all of a party's ship-to-split pivot rows = its merged
qty (correct, conserves the total).

For the raw JSW/JVML export docs (which lack `transport_mode`/`destination`), a
small `stock_doc_identity(doc, first_doc)` re-derives the same key from the doc +
the region first-doc map.

---

## Backend tasks

### B1 — carry `customer_name` into the pivot rows
- **`backend/app/services/report/pivot.py`** — `aggregate_pivot()` `$group`: add
  `"customer_name": {"$first": "$customer_name"}` (sibling of `total`).
  Constant per party within a group, so `$first` matches the drill-down's
  `doc.customer_name`.
- **`backend/app/services/report/generate.py`** — `_build_pivot_rows()`: pass
  `customer_name=_strip_or_none(row.get("customer_name"))` into `ReportPivotRow(...)`.
- **`backend/app/schemas/report.py`** — `ReportPivotRow`: add
  `customer_name: str | None = None` (defaulted → back-compat for existing
  constructors/tests).

### B2 — new `backend/app/services/report/exclusion.py` (pure helpers)
- `excluded_key_union(body) -> set[str]` — flat union of `exclusions[*].keys`.
- `stock_doc_identity(doc, first_doc) -> str` — 8-field key from a raw
  JSW/JVML doc, `transport_mode`/`destination` from `first_doc[party_code_normalized]`,
  built to equal `row_identity()` byte-for-byte (uses `_strip_or_none`, `chr(31)`).
- `apply_pivot_exclusions(report, keys) -> None` — drop `report.rows` whose
  `row_identity(r) ∈ keys`; recompute `grand_total`, `grand_nco_yes_do`,
  `grand_required_credit`, and `rake_totals`/`transport_mode_totals` (via
  `_compute_totals`) **in place**. (No `first_doc` needed — pivot rows already
  carry all 8 fields.)
- `filter_stock_docs(docs, first_doc, keys) -> list` — drop docs whose
  `stock_doc_identity ∈ keys`.

  Imports: `row_identity` from `.rake_drilldown`, `_compute_totals` /
  `_strip_or_none` from `.generate` (leaf module → no import cycle).

### B3 — wire it into `export_combined.py`
- Compute `excluded_keys = excluded_key_union(body)`.
- After `report = await generate_report(query)`: if `excluded_keys`, call
  `apply_pivot_exclusions(report, excluded_keys)` **before** `write_pivot_sheet`
  and the two totals sheets.
- **TOTAL RAKE REPORT / TRANSPORT MODE TOTAL**: use the now-adjusted
  `report.rake_totals` / `report.transport_mode_totals` directly. **Delete** the
  FE-`subtract` / `transport_subtract` arithmetic (now derived from keys — the
  trustworthy source; the redundant float fields stay in the schema, ignored).
- **JSW / JVML sheets**: if `excluded_keys`, lazily resolve `first_doc` via
  `_resolve_region_customers(query.region_id)[2]` and
  `docs = filter_stock_docs(docs, first_doc, excluded_keys)` before writing
  (subtitle count reflects the filtered length).
- `rake_merged` / `rake_unmerged`: unchanged (already key-driven via `_keep`).

### B4 — test (one runnable check)
- **`backend/tests/`** — unit test that `stock_doc_identity(doc, first_doc)` ==
  `row_identity(equivalent RakeDrilldownRow)`, and that `apply_pivot_exclusions`
  on a synthetic `ReportResponse` drops the matching rows and recomputes
  `grand_total` + `rake_totals` (pure, no DB).

---

## Frontend tasks (pivot = client-side, instant)

### F1 — type
- **`frontend/src/types/report/report.ts`** — `ReportPivotRow`: add
  `customer_name: string | null`.

### F2 — exclusion helpers
- **`frontend/src/components/report/rake-exclusions.ts`**:
  - widen `rowKey()`'s param type to also accept `ReportPivotRow` (runtime already
    casts to a record; pivot rows now carry all 8 fields).
  - `excludedKeyUnion(excl): Set<string>` — all keys across all rakes.
  - `applyPivotExclusions(report, excl): ReportResponse` — returns `report`
    unchanged when no exclusions; else `{ ...report, rows, grand_total,
    grand_nco_yes_do, grand_required_credit }` with excluded rows filtered out and
    the three grand scalars recomputed from the survivors. (rake_totals /
    transport_mode_totals left untouched — `RakeTotalsTab` owns those.)

### F3 — wire the pivot
- **`frontend/src/components/report/ReportSection.tsx`** —
  `const pivotReport = useMemo(() => applyPivotExclusions(report, exclusions), [report, exclusions])`;
  render `<ReportPivotTable report={pivotReport} … />`. No change to
  `ReportPivotTable` / `report-grouping` / `report-cells` (they render whatever
  rows + grand scalars they're handed). `RakeTotalsTab` keeps the original
  `report`.

The export request already POSTs `exclusions` (keys) — **no FE export change
needed**; the backend now consumes them for pivot/jsw/jvml.

---

## Consistency invariant (screen == export)

On-screen rake/transport (client subtract by `qty`) and export rake/transport
(server recompute by trimming pivot rows) both derive from the same identities;
`Σ(trimmed pivot-row totals) == Σ(excluded drill-down qty)` within the report's
days-filter + report_type scope, so they agree (modulo 3-dp display rounding).
The pivot nets the same identities on both sides.

## Risks / decisions baked in
- **R1 (days filter on stock sheets):** JSW/JVML export sheets stay full-stock
  (no qa-hold filter added); exclusion is row-presence removal of the party's
  identity ("remove this customer from the list") — the intended semantics for a
  raw list, and it changes nothing when there are no exclusions.
- **R5 (customer_name anomaly):** a party with >1 customer_name across docs is a
  data anomaly; `$first` picks one. Low risk; acceptable.
- Redundant `RakeExclusion.subtract` / `transport_subtract` kept in the
  schema/wire but ignored by the backend (keep-and-ignore one release).

## Verify
- `cd backend && ./.venv/bin/python -m pytest tests/ -q`
- `cd frontend && npm run lint && npm run build` (tsc)
- Manual: generate report → uncheck drill-down rows → pivot tab totals drop live;
  export with pivot+jsw+jvml ticked → those sheets exclude the same rows.

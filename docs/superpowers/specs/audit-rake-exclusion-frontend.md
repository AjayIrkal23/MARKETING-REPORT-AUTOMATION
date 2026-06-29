# Audit — RAKE drill-down exclusions on the `/report` page (frontend)

**Scope:** how the `/report` page renders its views, how the "Incl." drill-down
exclusion checkboxes work today, exactly what they currently affect, and precisely
where they must be extended so unchecking a drill-down row also subtracts from the
PIVOT, the JSW list, and the JVML list — live in the UI and in the export request.

**Method:** lean-ctx + jcodemunch read of the full `frontend/src` report tree plus
the backend export consumer (`export_combined.py`). No code modified.

> **Headline finding up front:** on the `/report` page there are only **two**
> on-screen views — the **PIVOT** ("Branch Wise Report") and the **RAKE Totals**
> ("Total Rake Report", incl. its drill-down). **JSW Stock List, JVML Stock List,
> and Credit Report are NOT on-screen views — they are export-only sheets** picked
> in `ExportSheetsDialog` and produced entirely server-side. The client never holds
> the jsw/jvml/credit row arrays. This single fact drives the whole verdict below.

---

## 1. Report page component tree + where each view's counts come from

```
ReportPage                         frontend/src/pages/report/index.tsx (ReportPage)
├─ ReportToolbar                   inputs (date/type/region/days) + Columns + Generate + Export
├─ ExportSheetsDialog              sheet-picker → confirmExport(sheets)
└─ ReportSection                   index.tsx:102-108  (props: report, visibleCols, groupBySoOrg, exclusions, onToggleExclusion)
   └─ Tabs (persisted "mra:report:tab")          ReportSection.tsx:60
      ├─ Tab "branch"  → ReportPivotTable         ReportSection.tsx:162   ← PIVOT view
      └─ Tab "rake"
         ├─ not drilled → RakeTotalsTab           ReportSection.tsx:177   ← RAKE-wise TOTAL + Transport Mode
         └─ drilled     → RakeDrilldownTable      ReportSection.tsx:167   ← merged "Total Rake Wise" / raw "Batch Rake Wise"
              drill state: useRakeDrilldown(report)  ReportSection.tsx:62  (separate API call)
              mode toggle merged|raw                  ReportSection.tsx:63
```

| View (on-screen) | Component (file) | Displayed counts/totals come from | Client array or server meta? |
|---|---|---|---|
| **PIVOT** ("Branch Wise Report") | `components/report/ReportPivotTable.tsx` | Body cells = `row.rake_quantities[col]` (`ReportPivotTable.tsx:185-187`); trailing Total = `row.total` (`report-cells.tsx:82`). **Subtotal** rows = client-summed via `buildRenderRows`→`addToAgg` (`report-grouping.ts:69-78`). **Grand-total footer**: rake columns render **blank** (`ReportPivotTable.tsx:195-197`); trailing credit cells use `grandAgg` seeded from **server** `report.grand_total / grand_nco_yes_do / grand_required_credit` (`ReportPivotTable.tsx:148-152`). | **Client array** `report.rows: ReportPivotRow[]` for body+subtotals; **server scalars** for the grand-total credit cells. |
| **RAKE-wise TOTAL** ("RAKE" table) | `components/report/RakeTotalsTab.tsx` | Rows from **server map** `report.rake_totals` (`RakeTotalsTab.tsx:123`); each row minus client exclusion subtraction; grand total = client `reduce` (`:129`). | **Server meta map** + client subtraction. |
| **Transport Mode TOTAL** | same `RakeTotalsTab.tsx` (2nd table) | **Server map** `report.transport_mode_totals` (`RakeTotalsTab.tsx:126`) minus `transportSubtract` (`:122`); grand = client reduce (`:130`). | **Server meta map** + client subtraction. |
| **RAKE drilldown** merged ("Total Rake Wise") / raw ("Batch Rake Wise") | `components/report/RakeDrilldownTable.tsx` | Rows = `drill.data.merged_rows` or `drill.data.rows` (`RakeDrilldownTable.tsx:69-71`). Footer Total = **client sum** of *checked* visible rows' `stock_quantity`, 3dp-rounded (`RakeDrilldownTable.tsx:78-88`). | **Separate API call** `GET /report/rake-drilldown` (`hooks/useRakeDrilldown.ts`), held only for the open rake. |
| **JSW Stock List** | *none — export-only* | `ExportSheetsDialog.tsx` option `jsw` (`:43`), built server-side by `export_combined.py:122-127` via `fetch_jsw_stock_docs` (**full** current-stock list). | **Not on client at all.** |
| **JVML Stock List** | *none — export-only* | `ExportSheetsDialog.tsx` option `jvml` (`:44`), built server-side `export_combined.py:129-134`. | **Not on client at all.** |
| **Credit Report** | *none — export-only* | `ExportSheetsDialog.tsx` option `credit` (`:45`), built server-side `export_combined.py:136-142`. | **Not on client at all.** |

All report state lives in `components/report/hooks/useReport.ts`. The generated
payload `data: ReportResponse` is persisted to localStorage (sliding 1h TTL,
`useReport.ts:84-87, 105`) so the report survives navigation without a refetch.

---

## 2. Exclusion state today (shape, location, set/reset, identity)

**Location & shape** — `useReport.ts:92`:
```ts
const [exclusions, setExclusions] = useState<RakeExclusions>({})   // browser-only, never persisted
```
- `RakeExclusions = Record<string /*rake*/, Record<string /*rowKey*/, ExcludedEntry>>` — `rake-exclusions.ts:60`.
- `ExcludedEntry = { qty: number; tm: string }` — `rake-exclusions.ts:53-56`. `qty` = **stock-type-scoped** quantity to subtract; `tm` = transport-mode bucket ("Unknown" when blank).
- It is a per-rake **Map-of-Maps** (object), keyed `rake → rowKey → entry`. Not a flat Set.

**Set on uncheck** (the data flow):
1. Checkbox `onChange` → `onToggleRow(key)` — `RakeDrilldownTable.tsx:128` (`key = rowKey(row)`, computed at `:119`).
2. → `ReportSection.handleToggleRow` — `ReportSection.tsx:64-69` — calls
   `onToggleExclusion(drill.rake, key, matchInfoFor(drill.data.rows, key, report.report_type))`.
   The `ExcludedEntry` (qty+tm) is computed here by `matchInfoFor` (`rake-exclusions.ts:91-105`):
   sums `stock_quantity` over the **unmerged** `rows` whose `rowKey === key`, scoped to
   report_type (`both` → all matching rows; single → only `r.stock_type === reportType`).
3. → `useReport.toggleExclusion` — `useReport.ts:111-124` — adds/removes `key` in `exclusions[rake]`; drops the rake entry when its map empties.

**Reset on generate / input change:**
- On a fresh report: `setExclusions({})` inside `generate().then` — `useReport.ts:156`.
- On **any** toolbar input change (date/type/region/days): `patchInputs` clears stale
  exclusions — `useReport.ts:128-130` (so an export against live inputs can't apply
  unchecks computed against an old drill-down). Wired via `setDate/setReportType/setRegionId/setDays` `useReport.ts:132-135`.
- Never written to localStorage (`useReport.ts:91` comment; only inputs/data/cols are persisted).

**rowKey identity** — `rake-exclusions.ts:43-46`:
```ts
const KEY_SEP = String.fromCharCode(31)             // rake-exclusions.ts:25  (ASCII Unit Separator, chr31)
IDENTITY_FIELDS = [                                 // rake-exclusions.ts:31-40  (backend order)
  "so_sales_org", "distr_chnl", "sales_office", "sold_to_party",
  "party_code", "transport_mode", "destination", "customer_name",
]
rowKey(row) = IDENTITY_FIELDS.map(f => (row[f] ?? "").toString().trim()).join(KEY_SEP)
```
- **8 fields**, separator `chr(31)`. Byte-for-byte mirror of backend
  `rake_drilldown.py::row_identity` (line 50).
- **Deliberately excludes** `stock_type` and `ship_to_party` (the two columns the
  merge drops — `RakeDrilldownTable.tsx:33-35`), so a merged row and its underlying
  unmerged rows share one key and **toggle together**.

---

## 3. Current effect of unchecking — exactly four things

1. **RAKE Totals table** — `RakeTotalsTab.tsx:123-124`:
   `qty - subtractFor(exclusions, rake)` clamped `≥0`. `subtractFor` sums all
   `ExcludedEntry.qty` for that rake (`rake-exclusions.ts:64-70`). Grand total
   re-summed `:129`.
2. **Transport Mode Totals table** — `RakeTotalsTab.tsx:122,126-127`:
   `qty - tmSub[tm]`, where `tmSub = transportSubtract(exclusions)` regroups every
   excluded qty by its `tm` bucket across all rakes (`rake-exclusions.ts:73-83`).
   Grand total re-summed `:130`.
3. **Drilldown footer** — `RakeDrilldownTable.tsx:78-88`: footer "Total" = Σ
   `stock_quantity` of **non-excluded** visible rows (mode-aware), excluded rows
   also get `opacity-50` (`:124`).
4. **Export request body** — `useReport.confirmExport` `useReport.ts:185-202`:
   - `body = toExportBody(exclusions)` → per-rake `{ keys: string[], subtract: number }` (`rake-exclusions.ts:108-...`).
   - `transport_subtract = transportSubtract(exclusions)`.
   - Sent **only when non-empty**; a non-empty body flips the call from GET to **POST**
     with a JSON body (`api/report/export.ts:26-34`). Wire types `RakeExclusionWire` /
     `CombinedExportParams` in `types/report/report.ts:125-139`.
   - Backend `export_combined.py` applies them to **only**: TOTAL RAKE REPORT
     (`:89-91`), TRANSPORT MODE TOTAL (`:100-108`), and the rake_merged/rake_unmerged
     breakdown sheets (`:115-120`, via `rake_breakdown_export.py:83`).

**What unchecking does NOT currently touch (stated plainly):**
- **PIVOT (on-screen):** `ReportSection.tsx:162` renders
  `<ReportPivotTable report={report} visibleCols={visibleCols} groupBySoOrg={groupBySoOrg} />`
  with **no `exclusions` prop**. `ReportPivotTable` has zero exclusion awareness — it
  renders raw `report.rows`.
- **PIVOT (export sheet):** `export_combined.py:77-79` calls `write_pivot_sheet(wb, report, …)`
  — no exclusions threaded.
- **JSW list / JVML list / Credit (export sheets):** `export_combined.py:122-142`
  fetch the **full** stock/credit docs and ignore `excl` entirely (and they have no
  on-screen counterpart to begin with).

---

## 4. Data-availability check (the crux)

| Target | Underlying per-row data present client-side to subtract from? | Does an excluded drilldown row carry which cell/list-row it maps to? |
|---|---|---|
| **PIVOT** | **Partially.** `report.rows: ReportPivotRow[]` is a full client array; each row has `rake_quantities` (per-rake qty), `total`, and the group fields `so_sales_org / distr_chnl / sales_office / sold_to_party / party_code / ship_to_party / transport_mode / destination` (`types/report/report.ts:24-42`). | **No clean mapping.** The exclusion key uses **`customer_name`** (which `ReportPivotRow` does **not** carry) and **omits `ship_to_party`** (on which pivot rows are split). So the 8-field key can neither be reconstructed on a pivot row nor uniquely pin one — a single merged exclusion can span multiple ship-to-party pivot rows. You have the rake + a stock-scoped qty, but not a deterministic `(pivot-row, rake-cell)` target. |
| **JSW list** | **No — not on the client at all.** The only stock rows the client ever holds are the per-rake drilldown `rows[]` (carrying `stock_type`, `sales_office`, `stock_quantity`, 8-field identity) and **only for the currently open rake**. The full JSW list is fetched server-side at export time only (`fetch_jsw_stock_docs`). There is no array to subtract from. | Drilldown rows carry `stock_type` (jsw/jvml ✓), branch/org/party ✓, rake (context ✓), `stock_quantity` ✓ — but **no stock-doc id**, and the merged identity collapses multiple docs, so a row can't be pinned to one JSW stock document client-side. |
| **JVML list** | **No — not on the client at all** (same as JSW). | Same as JSW. |

**Bottom line on availability:**
- PIVOT data is present but **not cleanly mappable** from the exclusion identity
  (missing `customer_name` on pivot rows; `ship_to_party` split not in the key).
- JSW/JVML row data is **entirely absent** client-side — they are export-only,
  full-list sheets.

---

## 5. Gap list — precise components/hooks/api to change

**A. PIVOT, live on-screen**
- `components/report/ReportSection.tsx:162` — pass `exclusions` (and `report.report_type`)
  into `<ReportPivotTable>`. Today it receives none.
- `components/report/ReportPivotTable.tsx` — subtract excluded qty before rendering:
  body cells `:185-187`, trailing `row.total` (`report-cells.tsx:82`), subtotals
  (`report-grouping.ts:69-78`), and the grand-total credit cells (`ReportPivotTable.tsx:148-152`).
  Currently fully exclusion-blind.
- `components/report/report-grouping.ts:120-146` — `buildRenderRows`/`addToAgg` need
  exclusion-adjusted inputs (or a pre-pass netting excluded qty out of each row's
  `rake_quantities[rake]` and `total`).

**B. JSW / JVML, live on-screen**
- **No such views exist.** There is no jsw/jvml list component under `pages/report`
  or `components/report`, and `ReportResponse` (`types/report/report.ts:46-62`) carries
  no `jsw_rows`/`jvml_rows`. If "live JSW/JVML UI counts" is required, those views and
  their data must first be **added** to the page + payload before any subtraction can
  be shown live.

**C. Identity / contract**
- `components/report/rake-exclusions.ts:25-46` — the 8-field `rowKey` cannot address a
  pivot cell or a stock-doc row. To subtract precisely you must either (i) add
  `customer_name` to `ReportPivotRow` and reconcile the `ship_to_party` split, or
  (ii) have the backend return the adjusted data (see §6).
- `types/report/report.ts:125-139` — `RakeExclusionWire` is rake-scoped (`keys`+`subtract`);
  it is already enough for the backend to drop rows by `row_identity`, but the FE has no
  way to apply it to pivot/jsw/jvml itself.

**D. Export (FE already POSTs; BE must consume more)**
- `api/report/export.ts:26-34` already ships `exclusions` + `transport_subtract` as a POST
  body — **no FE change needed to send**.
- The miss is server-side: `export_combined.py` must thread exclusions into
  `write_pivot_sheet` (`:77-79`), `fetch_jsw_stock_docs` (`:122-127`), and
  `fetch_jvml_stock_docs` (`:129-134`). The backend can rebuild each stock doc's
  `row_identity` (it already does in `rake_drilldown.py:50`) and drop/net matching rows.

---

## 6. Recommended approach (evidence-based)

**Verdict: a backend recompute round-trip is required — pure client-side subtraction
is not feasible for JSW/JVML, and is unsafe/ambiguous for the PIVOT.**

Evidence:
1. **JSW/JVML are not in client memory.** They are never fetched to `/report`; only
   `export_combined.py:122-134` pulls them, server-side, at export time. With no client
   array there is literally nothing to subtract from on screen.
2. **The PIVOT identity does not line up.** `ReportPivotRow` lacks `customer_name`
   (`types/report/report.ts:24-42`) while the exclusion key requires it
   (`rake-exclusions.ts:31-40`); the merged key also drops `ship_to_party`, on which
   pivot rows are split — so one excluded row maps to an ambiguous set of pivot rows.
   Client subtraction would be heuristic, not exact.
3. **The contract already exists server-side.** The `chr(31)` `row_identity` is a shared
   FE/BE contract and the backend already reconstructs it from stock docs + `CustomerCode`
   in `rake_drilldown.py`. The backend can net out excluded rows from pivot/jsw/jvml
   **deterministically**; the client cannot.

Concrete recommendation:
- **Keep** the three things that already work client-side as-is — RAKE totals,
  Transport Mode totals, and the drilldown footer — they only need the per-row `qty`/`tm`
  the `ExcludedEntry` already carries.
- **Add a backend recompute** for the PIVOT (and for JSW/JVML if those become on-screen
  views): on drilldown toggle, POST the current `exclusions` (rake → keys) to a recompute
  endpoint (or extend `/report/generate` with an exclusions body) that returns
  exclusion-adjusted `rows`, `grand_*`, and — if jsw/jvml are shown — adjusted jsw/jvml
  rows/counts. The pivot then re-renders from the returned payload, **live, with no
  user-initiated regenerate**. Debounce the call so the heavy pivot+credit join isn't
  re-run on every checkbox click.
- **Mirror it in the export**: thread the same `keys` into `write_pivot_sheet` and the
  jsw/jvml fetchers in `export_combined.py` so the exported pivot/jsw/jvml sheets match
  the on-screen, exclusion-adjusted view. The FE already sends the body
  (`api/report/export.ts:26-34`); only the backend consumer must be extended.

---

### Appendix — key file:line index
- Page: `frontend/src/pages/report/index.tsx` (ReportSection mount `:102-108`).
- Section/tabs: `frontend/src/components/report/ReportSection.tsx` (pivot mount `:162`, drilldown `:167`, totals `:177`, toggle handler `:64-69`).
- Pivot: `frontend/src/components/report/ReportPivotTable.tsx` (cells `:185-187`, grand-total `:148-152, :191-200`); grouping `frontend/src/components/report/report-grouping.ts:69-78, :120-146`; cells `frontend/src/components/report/report-cells.tsx`.
- Rake totals: `frontend/src/components/report/RakeTotalsTab.tsx:122-135`.
- Drilldown table: `frontend/src/components/report/RakeDrilldownTable.tsx:78-88, :119, :128`.
- Exclusions core: `frontend/src/components/report/rake-exclusions.ts:25, :31-46, :53-60, :64-83, :91-112`.
- Hook/state: `frontend/src/components/report/hooks/useReport.ts:92, :111-135, :156, :185-202`; drilldown `frontend/src/components/report/hooks/useRakeDrilldown.ts`.
- API: `frontend/src/api/report/{generate.ts, export.ts:26-34, rake-drilldown.ts}`.
- Types: `frontend/src/types/report/report.ts:24-62, :125-139`.
- Export consumer (backend): `backend/app/services/report/export_combined.py:67-68, :77-79, :89-120, :122-142`; `rake_breakdown_export.py:83`; `rake_drilldown.py:50`.

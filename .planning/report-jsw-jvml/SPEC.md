# Report JSW/JVML — Detailed Action Plan (SPEC)

> Feature: a non-admin page **Report JSW/JVML** that builds a "Coil Stock" RAKE pivot
> for a selected date + report type + region. Rows group by SO Sales Org →
> Distr. Channel → Sold To Party → BRANCH (`sales_office`) → Party Code
> (`party_code_normalized`) → Ship To Party → Transport Mode → Destination → ROUTE;
> columns are the unique `CustomerCode.rake` values; values are the Sum of Stock
> Quantity. Credit-report checks are preserved.
>
> Grounded in **live data** (queried 2026-06-01) + authoritative models. All field
> names below are verified against the running MongoDB.

---

## 0. Verified data facts (do not re-guess)

| Fact | Value (verified) |
|---|---|
| coil_prices | ONE active doc `{quantity:1.0, price:1000000.0, active:true}` → `price_per_qty = price/quantity = 1,000,000` |
| regions | 1 region `WEST` (active); `region.id` hex = customer_codes.region_id |
| customer_codes.code | NOT zero-padded — `"40020365"`, `"8451"` (yard). Not unique. Has `region_id`, `segment`. |
| credit_report.customer | NOT zero-padded — `"40007312"`. Same shape as `party_code_normalized`. |
| credit_report.credit_control_area | `{"JV0H","VJ0H"}`. **JSW→VJ0H, JVML→JV0H.** A customer can appear in BOTH (pick correct CCA). |
| credit_report.blocked | `{None, "X"}` (text). |
| credit_report.credit_balance | float, may be negative or None. |
| stock.distr_chnl | jsw: `{MSME,OEM,Retail,SBU-A,Stock Transfer}`. |
| stock.so_sales_org | e.g. `"1001"`. |
| stock.sold_to_party | customer name from stock row. |
| stock.sales_office | e.g. `"Mumbai(HO)"`; rendered as BRANCH. |
| stock.party_code | zero-padded `"0040007312"` / `"0000008481"`. |
| stock.party_code_normalized | `lstrip("0")` → `"40007312"` / `"8481"` (set at ingest). |
| stock.ship_to_party | ship-to customer name from stock row. |
| stock fields | `so_sales_org, distr_chnl, sold_to_party, sales_office, party_code_normalized, ship_to_party, nco_declared("Yes"/"No"), do_no, aging(float), stock_quantity(float)` |
| CustomerCode.rake | RAKE values (e.g. `KKU`, `KRIR`, `PNCS`, `ROAD`) become pivot column headers. |
| region option API | `value = str(region.id)` (region_id), `label = name`. |
| DatePicker | emits `"dd-MM-yyyy"` string \| null (matches `report_date`). |

### The "00" party-code matching issue (RESOLVED)
- Universal join key = **`code.lstrip("0")`** applied to all three sources.
- Stock side: use `party_code_normalized` (already lstripped) — normalize defensively anyway.
- customer_codes.code & credit_report.customer: `lstrip("0")` (data is already clean, but
  handle a padded value gracefully so a future padded export still matches).
- Guard empty result of lstrip (all-zero) → skip.

---

## 1. Inputs (user controls on the page)

| Input | Required | Semantics |
|---|---|---|
| `date` | yes | `dd-mm-yyyy`; exact match on stock `report_date` (and credit `report_date`). |
| `report_type` | yes | `"jsw"` \| `"jvml"`. Picks stock collection + CCA (jsw→VJ0H, jvml→JV0H). |
| `region_id` | no | empty ⇒ ALL regions (all customer_codes). Set ⇒ only that region's customer_codes. |
| `days` | yes (default `include`) | aging filter: `include` \| `exclude` \| `only`. |

### Aging (`days`) filter — COMPLEMENTARY at boundary 2
- `include` → no aging filter (all rows).
- `exclude` → `aging <= 2` (exclude stock older than 2 days).
- `only`    → `aging > 2` (only stock older than 2 days).
- `aging is None` → only appears under `include` (fails both `<=2` and `>2`).
- (`exclude` ∪ `only` = `include`, no gap/overlap.)

---

## 2. Algorithm (backend service)

1. **Resolve region → customer codes.**
   - `region_id` set: `customer_codes.find({region_id})`; else `customer_codes.find({})`.
   - `normalized_codes = { c.code.lstrip("0") for c in codes if c.code.lstrip("0") }`.
   - `region_name` = region.name (or `"All Regions"`).
   - Collect `rake_columns = sorted(unique c.rake)` across the selected docs.
   - Build `customer_map = { normalized_code: first CustomerCode doc }` for enrichment.
2. **Pick stock model + CCA.** jsw→(`JswStock`, `["VJ0H","1000"]`); jvml→(`JvmlStock`, `["JV0H"]`).
3. **has_stock gate.** If `Stock.count({report_date: date}) == 0` ⇒ `has_stock=False`, return
   early (empty channels) — frontend shows "No stock excel for this date selected".
4. **Stock match + aging filter.** Filter: `report_date == date` AND
   `party_code_normalized ∈ normalized_codes` AND aging clause (§1).
5. **Pivot via aggregation** (`$group` for perf, ~17k jvml rows): group by
   `{so_sales_org, distr_chnl, sold_to_party, sales_office, party_code_normalized, ship_to_party}` →
   - `total = $sum(stock_quantity)`
   - `nco_yes_do = $sum(stock_quantity where nco_declared == "Yes")` (cond)
   - `nco_yes_do_count = $sum(1 where nco_declared == "Yes")`
6. **CustomerCode enrichment + RAKE pivot.** Look up the first `CustomerCode` document per
   normalized party code and attach `transport_mode`, `destination`, `route`, and `rake`.
   Build `rake_columns = sorted(unique CustomerCode.rake values)` for the selected region.
   Each aggregation row becomes one `ReportPivotRow`; its `rake_quantities` map puts the
   row `total` into the column matching the row's `rake` and `0` in every other RAKE column.
   > NOTE/ASSUMPTION: `nco_yes_do` is the **sum of stock_quantity** for NCO=Yes rows (so the
   > credit subtraction `total - nco_yes_do` is dimensionally valid). `nco_yes_do_count` is also
   > returned for display.
7. **has_credit gate.** `has_credit = credit_report.count({report_date: date, credit_control_area: {$in: ccas}}) > 0`.
   If False ⇒ every credit column renders "NO CREDIT REPORT FOUND".
8. **Credit map.** From `credit_report.find({report_date: date, credit_control_area: {$in: ccas}})`
   build `{ normalize(customer): {blocked: blocked=="X", credit_balance} }` (first wins).
9. **Coil price.** `CoilPrice.find_one({active: True})`.
   `price_per_qty = price/quantity` (None if no active price).
10. **Per-row credit augmentation.**
    - `required_credit = (total - nco_yes_do) * price_per_qty` (None if no price).
    - If `not has_credit` ⇒ `blocked=None, credit_balance=None, credit_status="NO CREDIT REPORT FOUND"`.
    - elif party not in credit map OR credit_balance is None ⇒ `credit_status="No Credit balance"`,
      `blocked = map.blocked if found else None`.
    - else ⇒ `blocked`, `credit_balance` set, credit_sufficient computed, `credit_status=""`.

---

## 3. API contract

`GET /report/generate` — non-admin (`get_current_user`). Query: `date`, `report_type`,
`region_id?`, `days`. Unknown-key rejection (5 allowed keys). Standard envelope.

```
ReportResponse {
  date, report_type, region_id?, region_name,
  days_filter, ccas, has_stock, has_credit_report,
  coil_price_per_qty: float|null,
  rake_columns: string[],      // sorted unique CustomerCode.rake values
  rows: ReportPivotRow[],
  grand_total, grand_nco_yes_do, grand_required_credit
}
ReportPivotRow {
  so_sales_org: string|null,
  distr_chnl: string|null,
  sold_to_party: string|null,
  sales_office: string|null,    // rendered as BRANCH
  party_code: string,           // normalized display ("40122581","8481")
  ship_to_party: string|null,
  transport_mode: string|null,  // from CustomerCode
  destination: string|null,     // from CustomerCode
  route: string|null,           // from CustomerCode.route
  rake_quantities: { [rake: string]: number },
  total, nco_yes_do, nco_yes_do_count,
  blocked: bool|null, credit_balance: float|null,
  required_credit: float|null, credit_sufficient: bool|null,
  credit_status: string,        // ""|"No Credit balance"|"NO CREDIT REPORT FOUND"
  credit_note: string
}
```

### Files (backend) — new `report` domain (mirror layered architecture)
- `schemas/report.py` — DTOs + `ReportType`/`DaysFilter` Literals + `ReportQuery`.
- `services/report/__init__.py`, `services/report/generate.py` (orchestrator),
  `services/report/pivot.py` (aggregation), `services/report/credit.py` (credit map + coil price).
- `utils/report/normalize.py` — `normalize_code(s)`.
- `controllers/report.py` — thin; unknown-key rejection; `get_current_user`.
- `routes/report.py` — `GET /report/generate`; register in `routes/__init__.py`.
- Audit: `/report/*` → category `report` (add to `_category`, AuditCategory Literals ×2,
  `_CATEGORIES`, frontend badge+types). [[audit-category-sync-points]]

---

## 4. Frontend

- Sidebar: `NAV_ITEMS` += `{label:"Report JSW/JVML", to:"/report", icon: FileSpreadsheet}` (non-admin).
- Route: `App.tsx` `/report` → `ReportPage` (ProtectedRoute).
- `pages/report/index.tsx` — orchestrator: `ReportToolbar` + `ReportTable` + empty/error states.
- `components/report/ReportToolbar.tsx` — DatePicker + report-type toggle (Tabs/SegmentedControl) +
  region AsyncCombobox (`searchRegionOptions`, optional) + days Select + **Generate** button.
- `components/report/ReportPivotTable.tsx` — RAKE pivot table: fixed row columns
  (SO Sales Org · Distr. Channel · Sold To Party · BRANCH · Party Code · Ship To Party ·
  Transport Mode · Destination · ROUTE) + dynamic RAKE columns + Total · NCO Yes+DO ·
  Blocked · Credit Balance · Required Credit · Credit Note. Grand total footer.
  INR `toLocaleString("en-IN")`. Blocked badge (red when true). Credit status text when no
  balance / no report.
- States: `has_stock=false` → "No stock excel for this date selected" panel;
  `has_credit_report=false` → credit columns show "NO CREDIT REPORT FOUND".
- `components/report/hooks/useReport.ts` — query state {date,report_type,region_id,days} +
  generate()/loading/error/data.
- `types/report/report.ts` (+`-ui.ts`), `api/report/generate.ts`.
- File ≤250 lines; semantic tokens; no client-side compute of business values (all from API).

---

## 5. Edge cases (explicit)
- No stock for date → `has_stock=false` → page panel "No stock excel for this date selected".
- No credit report for date → `has_credit_report=false` → all credit cells "NO CREDIT REPORT FOUND".
- Party in stock but not in credit (CCA) → "No Credit balance".
- credit_balance None → "No Credit balance".
- No active coil price → `required_credit=null` (cell "—").
- region with no customer_codes → empty rows (valid; pivot empty).
- party in stock but with no matching CustomerCode → row still shown with null Transport Mode/Destination/ROUTE and zero in every RAKE column.
- aging None → only under `include`.

---

## 6. Process
Audit (parallel verify) → finalize → build BE+FE → review (parallel) → update docs
(`backend/CLAUDE.md`, `frontend/CLAUDE.md`, `CODEX.md`, macro_docs if needed).

# Backend Audit — RAKE Drilldown Exclusion Flow

**Scope:** How a browser-unchecked RAKE drilldown row (the canonical 8-field
identity) currently flows through the FastAPI backend during a combined report
export, which sheets it subtracts from today, and exactly where it must be
extended so it also subtracts from the **pivot**, the **JSW stock sheet**, and
the **JVML stock sheet** — and so the backend can recompute all of these from
the `keys` set alone (no frontend pre-computed `subtract` numbers).

**Root:** `/DATA/CODE_FILES/MARKETING REPORT AUTOMATION`
**Audited (read in full):** `backend/app/services/report/{generate,pivot,rake_drilldown,export_combined,rake_breakdown_export,export_totals,export}.py`, `backend/app/services/shared/stock_export.py`, `backend/app/services/jsw_stock/export.py`, `backend/app/utils/jsw_stock/query.py`, `backend/app/utils/report/normalize.py`, `backend/app/models/jsw_stock.py`, `backend/app/schemas/report.py`, `backend/app/controllers/report.py`.

> Note: jcodemunch has only the **frontend** TS/TSX indexed (Python backend is not in the symbol index), so all cites below are from direct file reads.

---

## 1. Data-flow map — who builds each sheet, from which rows, keyed how

The combined export entry point is `export_combined(query, body)` —
`export_combined.py:55`. One `generate_report(query)` call feeds the pivot +
both totals sheets (`export_combined.py:77-78`); the breakdown sheets re-run the
drilldown; the stock/credit sheets each run their own independent query.

| Sheet (tab) | Built by | Source rows | Keyed / aggregated | Cites |
|---|---|---|---|---|
| **pivot** ("BRANCH WISE PIVOT REPORT") | `write_pivot_sheet` → `_write_report` | `report.rows` (`list[ReportPivotRow]`) from `generate_report` | Rows are the **Mongo `$group`** output of `aggregate_pivot` keyed by 6 stock dims `{so_sales_org, distr_chnl, sold_to_party, sales_office, party (=party_code_normalized), ship_to_party}`, `total=$sum stock_quantity`; then enriched per normalized party with CustomerCode `rake/transport_mode/destination/route`; `rake_quantities = {rake: total}` (one rake per row). Sheet groups by Distr.Channel (single) or SO Sales Org (both). | `export_combined.py:80`; `export.py:write_pivot_sheet` (385); `pivot.py:103-124` (`$group`); `generate.py:177-235` (`_build_pivot_rows`), `generate.py:205-209` (`rake_quantities[rake]=total`) |
| **rake_totals** ("TOTAL RAKE REPORT") | inline in `export_combined` → `write_totals_sheet` | `report.rake_totals` dict | `_compute_totals`: for each pivot row, `rake_totals[rake] += qty` over `row.rake_quantities` → `rake_totals[rake] = Σ total` of rows carrying that rake | `export_combined.py:90-101`; `generate.py:143-155` (esp. `:152`); `export_totals.py:write_totals_sheet` |
| **transport-mode total** ("TRANSPORT MODE TOTAL") | inline in `export_combined` → `write_totals_sheet` | `report.transport_mode_totals` dict | `_compute_totals`: `tm = row.transport_mode or "Unknown"; tm_totals[tm] += row.total` | `export_combined.py:103-113`; `generate.py:153-154` |
| **rake_merged** ("{RAKE} - Total Rake Wise") | `write_rake_breakdown_sheets` → `_write_one` | per-rake `rake_drilldown(...).merged_rows` | One `rake_drilldown` per region rake; `_merge_rows` collapses the raw drilldown rows by the 8-field identity (drops `stock_type` + `ship_to_party`), sums qty, rounds to 3dp | `export_combined.py:115-121`; `rake_breakdown_export.py:100-126`; `rake_drilldown.py:58-112` (`_merge_rows`) |
| **rake_unmerged** ("{RAKE} - Batch Rake Wise") | `write_rake_breakdown_sheets` → `_write_one` | per-rake `rake_drilldown(...).rows` (raw `RakeDrilldownRow`) | Raw per-stock-doc rows for the rake (jsw ∪ jvml), unaggregated | `export_combined.py:115-121`; `rake_breakdown_export.py:128-137`; `rake_drilldown.py:114-203` |
| **JSW sheet** ("JSW Stock") | `fetch_jsw_stock_docs` + `write_jsw_stock_sheet` | **Separate full query** — `JswStockListQuery(date, region)` → `fetch_stock_docs` | `build_jsw_stock_filter` = `report_date == date` **only** (+ region join `customer_code_id ∈ region CustomerCodes`). **No** RAKE scope, **no** qa-hold `days` filter, **no** per-field filters set. Raw `JswStock` docs, sorted `+party_code`. | `export_combined.py:123-129`; `jsw_stock/export.py:fetch_jsw_stock_docs`; `stock_export.py:39-48` (`fetch_stock_docs`); `jsw_stock/query.py:36-58` (`build_jsw_stock_filter`) |
| **JVML sheet** ("JVML Stock") | `fetch_jvml_stock_docs` + `write_jvml_stock_sheet` | Same shape as JSW (structurally identical per `stock_export.py` docstring) | Same: `report_date == date` + region join only | `export_combined.py:131-137`; `jvml_stock/export.py` (mirrors jsw) |
| credit | `fetch_credit_report_docs` | independent date+region query | (out of scope for exclusions) | `export_combined.py:139-145` |

**Key structural fact:** the pivot + the two totals all derive from the SAME
`ReportPivotRow` list (`report.rows`), so removing/adjusting pivot rows
automatically and consistently re-derives `rake_totals` and
`transport_mode_totals` via `_compute_totals`. The **JSW/JVML sheets do NOT come
from `report.rows`** — they are independent raw-doc queries (a superset; see §3).

---

## 2. Current exclusion threading — function by function

The optional POST body is `CombinedExportBody` (`schemas/report.py:103-114`):

```python
class CombinedExportBody(BaseModel):
    exclusions: dict[str, RakeExclusion] = {}        # RAKE -> {keys: list[str], subtract: float}
    transport_subtract: dict[str, float] = {}        # transport_mode -> qty to subtract
```

`RakeExclusion` (`schemas/report.py:80-94`): `keys` = list of canonical 8-field
identity strings; `subtract` = a float **the frontend pre-computes** (stock-type
scoped, browser-side).

Controller `export_combined_controller` (`controllers/report.py:80-103`) accepts
`body: CombinedExportBody | None` on GET **or** POST; GET → `body=None` (full
file). It just forwards `(query, body)` to `export_combined`.

Inside `export_combined`:

- `excl = body.exclusions` and `tm_sub = body.transport_subtract` are unpacked
  (`export_combined.py:67-68`).

**(a) TOTAL RAKE REPORT** — `export_combined.py:88-101`. Uses the FE-precomputed
float only:
```python
adj_rows = sorted(
    (rake, max(0.0, qty - (excl[rake].subtract if rake in excl else 0.0)))
    for rake, qty in report.rake_totals.items())
```
The `keys` set is **not** consulted here. Backend does not recompute; it trusts
`subtract`. Clamped at 0.

**(b) TRANSPORT MODE TOTAL** — `export_combined.py:103-113`. Same pattern with
the separate `transport_subtract` dict:
```python
tm_rows = sorted((tm, max(0.0, qty - tm_sub.get(tm, 0.0)))
                 for tm, qty in report.transport_mode_totals.items())
```
Again FE-precomputed; `keys` not used.

**(c) rake_merged / rake_unmerged** — `export_combined.py:115-121` passes
`exclusions={r: set(e.keys) for r, e in excl.items()}` (the **`keys`** set, not
`subtract`). Inside `write_rake_breakdown_sheets` (`rake_breakdown_export.py:88`),
`_keep(rows, excluded)` (`rake_breakdown_export.py:81-84`) drops rows whose
`row_identity(r)` ∈ excluded and **recomputes the Total server-side** from the
survivors:
```python
kept = rows if not excluded else [r for r in rows if row_identity(r) not in excluded]
return kept, round(sum(r.stock_quantity for r in kept), 3)
```
This is the only place the backend recomputes from `keys` alone.

**(d) pivot, JSW, JVML, credit** — receive **no** part of `body`. The pivot is
written from the untouched `report` (`export_combined.py:80`); the stock sheets
are written from their own untouched doc queries (`:123-137`).

### Verdict — what the body affects today

| Sheet | Affected today? | Mechanism |
|---|---|---|
| rake_merged / rake_unmerged | ✅ Yes | `keys` set → `row_identity` drop + server recompute |
| TOTAL RAKE REPORT | ✅ Yes (partial) | FE-precomputed `exclusions[rake].subtract` float only |
| TRANSPORT MODE TOTAL | ✅ Yes (partial) | FE-precomputed `transport_subtract[tm]` float only |
| **pivot** | ❌ **No** | written from untouched `report.rows` |
| **JSW sheet** | ❌ **No** | independent raw query, body ignored |
| **JVML sheet** | ❌ **No** | independent raw query, body ignored |
| credit | ❌ No (by design) | independent query |

So today: **two** sheets are driven by the trustworthy `keys` set (breakdowns),
**two** are driven by FE-precomputed floats (totals), and **three** (pivot, jsw,
jvml) are completely unaffected.

---

## 3. Identity ↔ stock-row mapping (the crux)

### The canonical identity
`row_identity` (`rake_drilldown.py:50-55`) joins, with `chr(31)`, the stripped
(`None`→`""`) values of the **8 fields** in `_IDENTITY_FIELDS`
(`rake_drilldown.py:38-47`), in order:

```
so_sales_org · distr_chnl · sales_office · sold_to_party · party_code · transport_mode · destination · customer_name
```

NOT in the key: `stock_type` (jsw/jvml source) and `ship_to_party`
(`rake_drilldown.py` docstring + `_merge_rows` `:58-90`).

How each field is produced when the drilldown builds a `RakeDrilldownRow`
(`rake_drilldown.py:160-173`): `so_sales_org/distr_chnl/sold_to_party/sales_office`
= `_strip_or_none(doc.<field>)`; `party_code` = `_strip_or_none(doc.party_code_normalized)`
(**normalized**, leading zeros stripped); `customer_name` = `_strip_or_none(doc.customer_name)`;
`transport_mode`/`destination` = `_strip_or_none(cc.transport_mode/destination)`
where `cc = first_doc[party_code_normalized]` (CustomerCode master, NOT on the
stock doc).

### (a) Identity → pivot cell? — YES, but one-to-many (split by ship_to_party)
A `ReportPivotRow` carries 7 of the 8 identity fields:
`so_sales_org, distr_chnl, sales_office, sold_to_party, party_code (=normalized),
transport_mode, destination` (`schemas/report.py:117-140`; built `generate.py:177-235`).
The 8th, **`customer_name`, is absent from `ReportPivotRow`** — but it is
functionally determined by `party_code` (mapped master name attached at ingest,
1:1 with the customer code), so it can be re-derived.

Decisive mismatch: the pivot row's group key **includes `ship_to_party`**
(`pivot.py:108-114`) which the identity **drops**. Therefore one merged identity
corresponds to **≥1 pivot rows** (one per distinct ship-to under the same party).
`transport_mode`/`destination` agree because both pivot and drilldown derive them
from the same CustomerCode `first_doc[normalized]` — consistent by construction.

Implication: you cannot subtract from a single pivot "cell." Within one
`generate_report(query)` (same `days` filter), the identity's merged qty equals
exactly `Σ total` over the matching ship-to-split pivot rows. So removing/zeroing
all pivot rows whose 5 stock dims (+derived tm/dest) match an excluded identity
is well-defined and conserves the total. **Map by the 5 stock dims + derived
tm/dest (+ re-derived customer_name); ignore ship_to_party.**

### (b) Identity → raw JSW/JVML stock row? — YES, by reconstructing the identity
A raw `JswStock`/`JvmlStock` doc (`models/jsw_stock.py`) has, directly:
`so_sales_org, distr_chnl, sold_to_party, sales_office, ship_to_party,
customer_name, party_code_normalized, stock_quantity`. It does **NOT** carry
`transport_mode`/`destination` (those are CustomerCode master fields; the stock
doc has its own unrelated `route`/`route_desc`).

Field correspondence and gotchas:

| Identity field | Raw stock doc source | Gotcha |
|---|---|---|
| so_sales_org | `doc.so_sales_org` | strip + `None`→`""` to match |
| distr_chnl | `doc.distr_chnl` | strip |
| sales_office | `doc.sales_office` | strip |
| sold_to_party | `doc.sold_to_party` | strip |
| party_code | **`doc.party_code_normalized`** | ⚠️ NOT `doc.party_code` (that is zero-padded e.g. `"0000008481"`); identity uses the `lstrip("0")` form (`normalize.py:normalize_code`) |
| transport_mode | **not on doc** → `first_doc[party_code_normalized].transport_mode` | ⚠️ must re-enrich from CustomerCode, exactly as the drilldown does (`rake_drilldown.py:171`) |
| destination | **not on doc** → `first_doc[party_code_normalized].destination` | ⚠️ same re-enrichment |
| customer_name | `doc.customer_name` | strip |
| (ship_to_party) | `doc.ship_to_party` | **NOT in key** — so matching by identity drops ALL ship-to splits of a party (intended: equals the merged qty) |
| (stock_type) | jsw vs jvml collection | **NOT in key** — identity cannot tell which sheet a key belongs to; matching per-sheet naturally scopes it |

**Verdict:** a raw stock row IS matchable to a drilldown identity, but ONLY by
computing `row_identity` on the raw doc with the SAME recipe the drilldown uses:
strip fields, use `party_code_normalized` for `party_code`, and enrich
`transport_mode`/`destination` from `CustomerCode.first_doc[normalized]`. This is
the single non-trivial helper the feature needs.

### Why the stock sheets are a SUPERSET of the drilldown (scope mismatches)
1. **No RAKE scope:** the JSW/JVML sheet query is `report_date == date` + region
   only (`jsw_stock/query.py:36-58`); the drilldown restricts to
   `party_code_normalized ∈ {codes whose first-doc rake == target}`
   (`rake_drilldown.py:130-138`). The sheet includes parties of every rake.
2. **No `days`/qa-hold filter:** the drilldown applies `qa_hold_match(query.days)`
   (`rake_drilldown.py:142`, `pivot.py:qa_hold_match`); the stock sheet applies
   **none**. If the report ran with `days=exclude|only`, the excluded identity's
   qty reflects the qa-filtered subset, while the sheet holds the full
   (`include`) set — dropping rows matching the identity from the unfiltered
   sheet would drop MORE than was excluded. **Real risk — see §6.**
3. **jsw ∪ jvml union:** the drilldown always unions both collections
   (`rake_drilldown.py:34`); in single `jsw` report mode the keys can include
   jvml-only identities (and vice-versa). Matching per-sheet handles this
   (a jvml-only key matches no jsw row), but it explains why a flat union of
   keys is acceptable across both sheets.

---

## 4. Gap list — exact places to change

To make exclusions subtract from **pivot + JSW + JVML** and let the backend
recompute totals **from `keys` alone**:

**G1 — New shared helper: identity from a raw stock doc / pivot row.**
Add (e.g. in `rake_drilldown.py` next to `row_identity`, or a small
`report/exclusion.py`) a function that builds the canonical 8-field identity for
(i) a raw `JswStock`/`JvmlStock` doc and (ii) a `ReportPivotRow`, taking a
`first_doc: dict[str, CustomerCode]` map so `transport_mode`/`destination` are
re-derived per `party_code_normalized` (mirror `rake_drilldown.py:160-173`).
This is the keystone — every sheet fix depends on it. Must stay byte-for-byte
identical to `row_identity` (`rake_drilldown.py:55`) and the FE `rake-exclusions.ts::rowKey`.

**G2 — Pivot (and the two totals) recompute in `export_combined`.**
`export_combined.py:77-113`. After `report = await generate_report(query)`,
compute the **union of all excluded keys** = `⋃ excl[r].keys`. Resolve the
region `first_doc` (already available via `_resolve_region_customers(query.region_id)`
— `generate.py:48`, also used by the breakdown writer). Drop (or zero `total` +
the single `rake_quantities[rake]` entry of) every `report.rows` row whose
re-derived identity ∈ the union, then call `_compute_totals(report.rows)`
(`generate.py:143`) to get adjusted `rake_totals` + `transport_mode_totals`.
Feed the trimmed `report` to `write_pivot_sheet` (`:80`) and the recomputed dicts
to the two `write_totals_sheet` calls (`:90-101`, `:103-113`) — **replacing** the
`excl[rake].subtract` / `tm_sub` arithmetic. This single change fixes pivot AND
makes both totals key-driven (no FE floats).

**G3 — JSW sheet filter.** `export_combined.py:123-129`. After
`fetch_jsw_stock_docs(...)`, filter `docs` to those whose re-derived identity (G1,
using `first_doc`) is **not** in the excluded-key union. Pass the filtered list +
a `len(docs)` that reflects the filtered count to `write_jsw_stock_sheet`.

**G4 — JVML sheet filter.** `export_combined.py:131-137`. Identical treatment to
G3 for `fetch_jvml_stock_docs`.

**G5 — Decouple from FE-precomputed `subtract`.** Because G2 recomputes
`rake_totals`/`transport_mode_totals` server-side from `keys`, the
`RakeExclusion.subtract` float (`schemas/report.py:93`) and
`CombinedExportBody.transport_subtract` (`schemas/report.py:113`) become
**redundant**. Either ignore them in `export_combined` (keep for back-compat) or
remove them (§5).

**G6 (optional, recommended) — A "preview recompute" endpoint** so the FE never
computes `subtract` and the on-screen totals match the export exactly. See §5.

**Out of scope to change:** `rake_breakdown_export.py` already does the right
thing (`_keep` recomputes from `keys`); `_compute_totals`/`generate_report` need
no change (reused as-is after row removal).

---

## 5. Schema / contract changes

`backend/app/schemas/report.py`:

- **`RakeExclusion`** (`:80-94`): `subtract` is no longer needed once G2 lands —
  the backend derives the subtraction from `keys`. Options: (a) keep the field
  but ignore it (lowest risk, no FE break), or (b) drop it. Recommend keep-and-
  ignore for one release, then remove.
- **`CombinedExportBody`** (`:103-114`): `transport_subtract` likewise becomes
  derivable from `keys` (G2) — keep-and-ignore or drop. Consider adding an
  explicit, sheet-agnostic field for the stock sheets:
  - `excluded_keys: list[str]` — the flat union of all `keys` across rakes — so
    G3/G4 don't have to flatten `exclusions` themselves and the contract states
    that stock-sheet exclusion is rake-agnostic. (Equivalent to `⋃ exclusions[*].keys`;
    add only if the FE prefers to send it pre-unioned.)
- No change to `ReportPivotRow`, `RakeDrilldownRow`, `RakeDrilldownMergedRow`,
  `ReportResponse` — the 8 identity fields already exist where needed (with the
  noted exception that `customer_name` is absent from `ReportPivotRow` and must
  be re-derived from `party_code`).

Optional **preview endpoint** (G6): `POST /report/export-preview` taking the same
query + `CombinedExportBody`, returning adjusted `rake_totals`,
`transport_mode_totals`, and pivot grand totals computed by the SAME G2 routine.
Wire it in `controllers/report.py` (mirror `export_combined_controller`
`:80-103`, add the key to a `_ALLOWED_*` whitelist). This removes the last reason
for the FE to pre-compute any `subtract`, guaranteeing screen == export.

---

## 6. Risks / fragile areas

- **R1 — qa-hold `days` filter mismatch on stock sheets (highest risk).** The
  JSW/JVML sheet query has **no** `qa_hold_match(days)` (`jsw_stock/query.py:36-58`),
  but the excluded identities (and their qty) were produced under the report's
  `days` filter (`rake_drilldown.py:142`). When `days ∈ {exclude, only}`,
  identity-matching the unfiltered sheet drops rows that were never in the
  exclusion's qty basis → over-subtraction / Σ-conservation broken between the
  pivot and the stock sheets. Mitigation: apply `qa_hold_match(query.days)` to
  the stock-sheet fetch too (so the sheet matches the pivot universe), OR
  document that stock-sheet exclusion is row-presence based and only valid for
  `days=include`. This must be an explicit product decision.

- **R2 — Single `jsw`/`jvml` mode, drilldown is a superset.** The drilldown
  unions jsw+jvml (`rake_drilldown.py:34`), so `keys` may contain identities
  absent from the chosen report type / a given sheet. Per-sheet identity matching
  is naturally a no-op for non-matching keys, but the `stock_type`-less identity
  means you cannot route a key to "only the jsw sheet" — both sheets are filtered
  by the same union. Confirm that's the intended semantics.

- **R3 — `ship_to_party` collapse.** Identity drops `ship_to_party` while the
  pivot group key and raw stock rows retain it. Subtracting by identity therefore
  removes ALL ship-to splits of a party (= the merged qty). Correct for the
  merged view, but means a user cannot exclude a single ship-to leg — by design
  (`_merge_rows` docstring, `rake_drilldown.py:58-69`). Pivot subtraction must
  remove every matching ship-to-split row, not just one.

- **R4 — 3-dp rounding / float order (WR-01).** Drilldown sums round to 3dp once
  at the end (`rake_drilldown.py:_merge_rows`, `rake_breakdown_export.py:_keep`).
  The pivot/`rake_totals` path sums un-rounded floats (`_compute_totals`,
  `generate.py:143-155`). Recomputing pivot totals after row removal and the
  breakdown's `_keep` total can differ in the 3rd decimal; round consistently
  (round once at display, like existing code) to avoid a visible mismatch
  between "TOTAL RAKE REPORT" and "{RAKE} - Total Rake Wise".

- **R5 — `customer_name` not on `ReportPivotRow`.** Pivot-row identity must
  re-derive `customer_name` from `party_code` (1:1 mapped master name). If a
  party ever maps to >1 `customer_name` across stock rows (data anomaly), the
  pivot-side identity could diverge from the drilldown-side identity for the same
  party. Low likelihood but worth a guard/assert.

- **R6 — `transport_mode`/`destination` re-derivation must reuse `first_doc`.**
  Both the drilldown (`rake_drilldown.py:160-173`) and the pivot
  (`generate.py:195-203`) enrich from `first_doc[party_code_normalized]`
  (first-doc-wins CustomerCode). The new G1 helper MUST use the same `first_doc`
  map (from `_resolve_region_customers`) — deriving tm/dest any other way (or
  from a different region scope) will produce a non-matching identity and silently
  fail to exclude.

- **R7 — `subtract` trust removal is a behavior change.** Today TOTAL RAKE /
  TRANSPORT totals trust FE math; after G2 they are server-recomputed from
  `keys`. If the FE's `subtract` ever disagreed with `keys` (e.g. stale toolbar
  state, the very bug `cf55792` fixed), the exported number will change. This is
  the intended correctness fix, but call it out as a contract change.

---

### One-paragraph implementation pointer
Add the G1 identity helper (raw-doc + pivot-row → canonical 8-field key, taking
`first_doc`); in `export_combined` compute the excluded-key union once, fetch
`first_doc` via `_resolve_region_customers(query.region_id)`, trim `report.rows`
by that union before `write_pivot_sheet` and re-run `_compute_totals` for the two
totals sheets, and filter the jsw/jvml `docs` lists by the same union — then the
FE `subtract`/`transport_subtract` floats can be retired. The only genuinely
open product decision is R1 (whether the stock sheets should also honor the
`days` qa-hold filter so their universe matches the pivot's).

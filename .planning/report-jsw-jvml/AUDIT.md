# AUDIT.md — JSW/JVML Report Feature Spec Audit

**Date:** 2026-06-01
**Audit agents:** 24 parallel
**Summary:** 7 PASS · 5 GAP · 7 CORRECTION (5 areas are PASS, 5 have gaps without wrong claims, 7 have outright incorrect claims requiring spec changes)

---

## Corrections to Apply to SPEC

### Area: JVML stock model / columns

- **SPEC §2 pivot step 5 + §5 edge cases:** Both `JswStock.distr_chnl` and `JvmlStock.distr_chnl` are `str | None` (per models). The pivot must handle `None` as a valid channel key — either group under `""` or omit. Add to §5: `distr_chnl None → rows still in stock; pivot groups them under channel key "" (or omits, TBD); must not crash.`
- **SPEC §2 pick-stock-model note:** JVML model keeps the field name `jsw_grade` (not `jvml_grade`). The pivot service must reference `jvml_stock.jsw_grade` by its real field name if that column is used.

---

### Area: Region model + name lookup

- **SPEC §2 step 1 — reuse pattern:** Do NOT re-implement `PydanticObjectId` + `Region.get` inline. Call the existing `region_name_for(region_id: str) -> str | None` from `backend/app/services/customer_code/region_link.py`. Import: `from ..customer_code.region_link import region_name_for`. Usage: `region_name = await region_name_for(region_id) or 'All Regions'`.
- **SPEC §2 step 1 — validation error type:** When `region_id` is provided but invalid/missing, raise `ValidationError` (400), not `NotFoundError` (404). Mirror `resolve_region_or_400` in `services/customer_code/region_link.py:30–65` which raises `ValidationError('Invalid or unknown region.', details={'field': 'region_id'})`.

---

### Area: Coil price service

- **SPEC §2 step 8 — sort required:** Change `CoilPrice.find_one({"active": True})` to `await CoilPrice.find({"active": True}).sort("+quantity").first_or_none()`. Without the sort MongoDB returns natural/insertion order, not the lowest-quantity document, violating the stated tie-break rule.

---

### Area: Aggregation pipeline

- **SPEC §2 step 5 — $first accumulators missing:** The `$group` stage must explicitly include `"sold_to_party": {"$first": "$sold_to_party"}, "route_desc": {"$first": "$route_desc"}` — omitting them means those fields are absent from group results.
- **SPEC §2 step 5 — compound _id form:** `_id` in `$group` must be a sub-document: `{"_id": {"distr_chnl": "$distr_chnl", "party_code_normalized": "$party_code_normalized"}, ...}`. Results come back as raw dicts with `row["_id"]["distr_chnl"]` and `row["_id"]["party_code_normalized"]`.
- **SPEC — Beanie aggregate gotcha:** `Document.aggregate(pipeline)` appends FindMany's sort/skip/limit stages AFTER your pipeline stages. Always pass the full pipeline including `$match` as the first stage to `Document.aggregate([{$match:...}, {$group:...}])` with no `projection_model`; results are `list[dict[str, Any]]`.
- **SPEC — no projection_model on aggregate:** Since group output fields (`total`, `nco_yes_do`, etc.) are not Beanie document fields, pass no `projection_model`. Do NOT pass a Pydantic model as `projection_model` unless a `$project` stage first renames `_id` sub-fields to top-level names (Beanie appends an automatic `{$project: ...}` stage when `projection_model` is set).

---

### Area: Existing list service / route pattern

- **SPEC §3 — key count wrong:** Change `(5 allowed keys)` to `(4 allowed keys)`. The `ReportQuery` params are `date, report_type, region_id, days` — exactly 4. `_ALLOWED_GENERATE_KEYS = frozenset({'date', 'report_type', 'region_id', 'days'})`.
- **SPEC §3 — single router only:** `routes/report.py` must export one `router` (no `config_router`) since there is no admin config endpoint for this domain — unlike `jsw_stock`/`jvml_stock`/`credit_report`.
- **SPEC §3 — explicit route registration:** In `backend/app/routes/__init__.py`, two required steps: (1) add `report` to the `from . import (...)` tuple (alphabetically between `meta` and `region`); (2) add `api_router.include_router(report.router)` after the `dashboard.router` include call. Omitting either silently breaks registration.

---

### Area: Audit category sync

- **middleware/audit.py `_CATEGORY_PREFIXES`:** Add `("/report", "report")` BEFORE the `("/admin", "admin")` catch-all (currently line 69). There is no `/admin/report` sub-path so only one entry is needed.
- **models/audit_log.py line 17:** Extend `AuditCategory` Literal to include `"report"` appended after `"coil_config"`.
- **schemas/audit_log.py line 22:** Extend the same `AuditCategory` Literal identically (kept in sync with model).
- **services/audit_log/options.py line 28:** Append `"report"` to `_CATEGORIES` list.
- **frontend/src/types/admin/audit-log.ts:** Add `| "report"` to the `AuditCategory` union type.
- **frontend/src/components/admin/audit-logs/AuditCategoryBadge.tsx `CATEGORY_MAP`:** Add `report: { label: "Report", className: "border-lime-200 bg-lime-50 text-lime-700 dark:border-lime-800 dark:bg-lime-950/50 dark:text-lime-400" }`. Lime is unused by any existing category.

---

### Area: Aging day-filter

- **SPEC §1 — aging is unindexed:** Note that `aging` is `float | None` with no `Indexed()` in either model (`jsw_stock.py:51`, `jvml_stock.py:88`). The `$match` on aging runs post-`report_date`+`party_code_normalized` index reduction on ~17k rows — acceptable for current volume.
- **SPEC §2 step 4 — boundary polarity must be preserved exactly:** `exclude → {"aging": {"$lte": 2}}` (keeps 0..2 days); `only → {"aging": {"$gt": 2}}` (keeps >2 days); `include → {}` (no aging clause). Note: `$lte: 2` on a float field naturally excludes `None`/null docs — `aging=None` rows are silently dropped from `exclude` and `only` modes, which is the correct intent. Do NOT invert to `$lt`/`$gte` — fractional aging values exist; using `$lt: 2` would exclude rows with aging exactly `2.0`.

---

### Area: Credit balance column

- **SPEC §4 column list — two distinct columns:** Expand the single `"Credit Balance"` label to two explicit columns: `Credit Balance` (`credit_report.credit_balance` — SAP headroom = limit − exposure, INR, may be negative) and `Required Credit` (`(total − nco_yes_do) × price_per_qty`, service-computed). The single label is ambiguous and will cause implementation confusion.
- **SPEC §3 ReportChannel — missing subtotal field:** Add `subtotal_required_credit: float | null` to `ReportChannel`. The `grand_required_credit` rollup implies channel-level aggregation exists but the channel schema omits it, making subtotal rows unrenderable for this field.
- **SPEC §3 ReportParty — remaining_credit:** Add `remaining_credit: float | null = credit_balance − required_credit` as an API-computed field, or explicitly document why it is omitted. Per §4 rule "no client-side compute of business values (all from API)", this field MUST come from the API if shown in the table.
- **SPEC §3 response — grand_credit_balance missing:** `grand_required_credit` is present but `grand_credit_balance` is absent. Either add `grand_credit_balance: float | null` or explicitly state the grand total row leaves the credit_balance column blank.
- **SPEC §2 step 9 — credit_status empty-string note:** Frontend must branch on `credit_balance !== null` to render the numeric value, not on `credit_status === ''`. Add: "frontend renders `credit_balance` numerically when `credit_status` is `""` AND `credit_balance` is non-null; `required_credit` renders numerically when non-null regardless of `credit_status`."

---

### Area: Party-code 00 matching

- **normalize_code signature — specify it:** `def normalize_code(s: Any) -> str | None` where `s=None → None`, `str(s).strip()` empty `→ None`, `lstrip('0')` empty (all-zero guard) `→ None`, else return lstripped string. File: `utils/report/normalize.py`.
- **Canonical location — consolidate duplicates:** `utils/report/normalize.py` is the canonical location. The existing private `_normalize_party_code` in `services/jsw_stock/ingest.py:44` and `services/jvml_stock/ingest.py:47` should be updated to import from this shared utility. Otherwise three divergent copies exist.
- **Credit customer leading-zero risk:** `credit_report.customer` is typed `"text"` via `coerce_value`. When SAP exports as a numeric float (current behavior), `coerce_value` produces `str(int(float))` = `"40007312"` — no leading zeros. If SAP ever exports zero-padded strings, the join breaks silently. Ingest does NOT strip leading zeros from `credit_report.customer`. Document this dependency.

---

### Area: ZSD stock data dictionary

- **SPEC §0 `stock.distr_chnl` enumeration incomplete:** The authoritative doc (`macro_docs/zsd-currstk-hr.md` col #3) shows 8 distinct channel values: `{Auction, MSME, OEM, Others, Retail, SBU-A, SEZ/Deemed Export, Stock Transfer}`. SPEC lists only 5 (`{MSME, OEM, Retail, SBU-A, Stock Transfer}`). Correct to all 8 — all will appear in pivot output.
- **SPEC §4 column header "NCO Yes+DO" is ambiguous:** Split the clarification: `nco_yes_do` column = `$sum(stock_quantity where nco_declared == 'Yes')` (quantity, not count); `do_no` is a distinct per-party text field (Delivery Order number, sparse/null). Rename the display column to `"NCO Yes Qty"` or similar.

---

### Area: App route wiring

- **App.tsx import:** Add after line 16 (after `CreditReportPage` import): `import { ReportPage } from "@/pages/report"`
- **App.tsx route:** Add after line 31 (after `/credit-report`, before the `AdminRoute` block): `<Route path="/report" element={<ReportPage />} />`
- **Page file location:** `frontend/src/pages/report/index.tsx` (matches `@/pages/report` import resolution pattern used by all non-admin pages).

---

### Area: Sidebar nav item

- **nav-items.ts line 2:** Add `FileSpreadsheet` to the named lucide-react import: `import { Boxes, Building2, CreditCard, Disc3, FileSpreadsheet, LayoutDashboard, MapPin, ScrollText, Settings, UsersRound } from "lucide-react"`
- **nav-items.ts line 15:** Append `{ label: "Report JSW/JVML", to: "/report", icon: FileSpreadsheet },` after the Credit Report entry.

---

### Area: Shared form components

- **FETCHERS referential-stability rule (missing from spec):** Pass `searchRegionOptions` directly as a prop — do NOT wrap in an inline arrow `(q) => searchRegionOptions(q)`. That creates a new function reference on every render. For curried fetch factories, freeze the call result in a module-scope `FETCHERS` constant, never inside the component body.
- **AsyncCombobox onChange second argument (undocumented):** Actual signature is `onChange: (value: string | null, option?: AsyncOption) => void`. If `ReportToolbar` needs the region label for display, destructure the `option` parameter.
- **Antipattern to avoid:** `RegionTableToolbar.tsx:84` passes `fetchOptions={(q) => searchRegionOptions(q)}` — an inline arrow wrapper. Do NOT replicate this in `ReportToolbar`.

---

### Area: FE region option + table patterns

- **Money-cell recipe:** Use `fmtINR` (`"₹" + v.toLocaleString("en-IN", { maximumFractionDigits: 2 })`, null/undefined → `"—"`) and `signClass` (null → `text-muted-foreground`, <0 → `text-destructive`, >0 → `text-emerald-600 dark:text-emerald-400`, 0 → `text-muted-foreground`) from `CreditReportTable.tsx:58–68`. Apply to both `credit_balance` and `required_credit` cells. Add `tabular-nums` class to all numeric cells.
- **Blocked badge condition mismatch:** `CreditReportTable` checks `blocked === "X"` (string). `ReportParty.blocked` is `bool | null`. `ReportTable` must render the blocked badge when `row.blocked === true` (boolean check, not string).

---

### Area: FE client + type conventions

- **buildQuery + null-stripping:** `buildQuery` (client.ts:86–93) skips `undefined` and `""` but NOT `null`. `region_id` is `string | null`. `buildParams` MUST map `region_id: q.region_id ?? undefined` (or conditional spread) so `null` is not forwarded as the string `"null"`. Pattern: `...(q.region_id ? { region_id: q.region_id } : {})`.
- **Types file split — explicit assignment:** Create TWO files: `frontend/src/types/report/report.ts` (API/domain types: `ReportType`, `DaysFilter`, `ReportParty`, `ReportChannel`, `ReportResponse`, `ReportQuery`) and `frontend/src/types/report/report-ui.ts` (UI contracts: `ReportQueryState`, `ReportToolbarProps`, `ReportTableProps`, `UseReportResult`). Matches the `<domain>/<domain>.ts` + `<domain>/<domain>-ui.ts` split.
- **ReportQueryState has NO pagination:** Contains only `{ date: string | null; report_type: 'jsw' | 'jvml'; region_id: string | null; days: 'include' | 'exclude' | 'only' }`. Do NOT inherit from `PageQuery`.

---

### Area: Grouped pivot table rendering

- **Column list missing Required Credit:** Full 9 data columns: `Distr.Chnl | Party Code | Sold To Party | Route Desc | Total | NCO Yes+DO | Blocked | Credit Balance | Required Credit`.
- **Blocked rendering — boolean not string:** Render `<Badge variant="destructive">Blocked</Badge>` when `blocked === true`. Do NOT mirror the `CreditReportTable` string check `blocked === "X"`.
- **File-size split is mandatory (not advisory):** CreditReportTable.tsx is 250 lines (flat). ReportTable will be ~350–400 lines with 3 row types + 9 columns. Mandatory split: (a) `ReportTable.tsx` — outer shell, header, loading/error/empty, channel iteration; (b) `ReportPartyRow.tsx` — single party `<TableRow>` with all 9 cells; (c) `ReportSubtotalRow.tsx` — channel subtotal `<TableRow>`. Each file ≤120 lines. Grand total uses existing `TableFooter`/`tfoot` from `ui/table.tsx`.
- **Channel group header row:** Use `<TableRow>` with full-width `<TableCell colSpan={9}>` carrying `bg-muted/50 font-medium text-sm`. No existing component to mirror — new row type.
- **Credit status cell rendering:** When `has_credit_report === false`, ALL THREE credit columns (`blocked`, `credit_balance`, `required_credit`) render the status string `"NO CREDIT REPORT FOUND"` (3 separate cells). When `credit_status === 'No Credit balance'`, same. When `credit_status === ''`, show numeric/badge values.
- **INR vs quantity formatting:** Use `"₹" + v.toLocaleString("en-IN", { maximumFractionDigits: 2 })` for `credit_balance` and `required_credit`. Use plain `toLocaleString()` (no ₹ prefix) for `total` and `nco_yes_do` (stock quantities).

---

## Confirmed Facts

### Models and field types
- `JswStock.stock_quantity`: `float | None`; `aging`: `float | None` (unindexed); `distr_chnl`: `str | None`; `party_code_normalized`: computed meta field (not in COLUMNS).
- `JvmlStock`: field-for-field identical to `JswStock`; collection is `"jvml_stock"`; keeps field name `jsw_grade` (not `jvml_grade`).
- `CreditReport.blocked`: `str | None` (`"X"` or `None`); `credit_balance`: `float | None`; `report_date`: `Annotated[str, Indexed()]` (dd-mm-yyyy string); no `party_code_normalized` field.
- `CustomerCode.region_id`: `Annotated[str, Indexed()]` (hex ObjectId FK string); `code` is SAP code without zero-padding (e.g. `"40020365"`, `"8451"`); `segment` field exists at `customer_code.py:29`.
- `CoilPrice.price_per_qty = price / quantity`; quantity enforced `gt=0`.

### Query patterns
- Region hex→ObjectId fetch: `oid = PydanticObjectId(region_id); doc = await Region.get(oid)` (see `services/region/get.py:32–36`). Use `region_name_for()` wrapper, not inline.
- Invalid `region_id` → `ValidationError` (400), not `NotFoundError` (404). Mirror `resolve_region_or_400` in `region_link.py:30–65`.
- Beanie aggregate call: `Document.aggregate([{$match:...}, {$group:...}]).to_list()` (no `projection_model`, no `length` arg). Results are `list[dict[str, Any]]`.
- `$group` compound key must be a sub-document; fields accessed as `row["_id"]["distr_chnl"]`, `row["_id"]["party_code_normalized"]`.
- Active coil price: `await CoilPrice.find({"active": True}).sort("+quantity").first_or_none()`.

### CCA mapping (confirmed from live data)
- `VJ0H` → JSW Steel Vijaynagar (`cca_description="HR-Vijaynagar"`).
- `JV0H` → JVML Vijaynagar (`cca_description="HR-JVML VJNR"`).
- 19 VJ0H rows + 15 JV0H rows kept from credit report.

### Normalize rule
- `normalize_code(s: Any) -> str | None`: `None → None`; empty-after-strip `→ None`; all-zeros after lstrip `→ None`; else `str(s).strip().lstrip("0")`.
- `credit_report.customer` stored without leading zeros under current SAP export behavior (numeric cell → `str(int(float))`). Join is safe; document the dependency.

### Audit category sync (6 sync points total)
- `middleware/audit.py _CATEGORY_PREFIXES`: insert `("/report", "report")` before `("/admin", "admin")`.
- `models/audit_log.py`: add `"report"` to `AuditCategory` Literal.
- `schemas/audit_log.py`: add `"report"` to `AuditCategory` Literal (kept in sync).
- `services/audit_log/options.py`: append `"report"` to `_CATEGORIES`.
- `frontend/src/types/admin/audit-log.ts`: add `| "report"` to `AuditCategory` union.
- `frontend/src/components/admin/audit-logs/AuditCategoryBadge.tsx`: add `report` entry with lime color tokens.

### Route registration (two mandatory steps)
- `from . import (...)` tuple: add `report` alphabetically between `meta` and `region`.
- `api_router.include_router(report.router)`: one call only (no `config_router`).

### Frontend conventions
- Types split: `types/report/report.ts` (domain types) + `types/report/report-ui.ts` (UI contracts). `ReportQueryState` has NO pagination fields.
- `buildQuery` skips `undefined` and `""` but NOT `null`. Map `region_id` with `?? undefined`.
- `distr_chnl` enumeration has 8 values: `Auction, MSME, OEM, Others, Retail, SBU-A, SEZ/Deemed Export, Stock Transfer`.
- `ReportTable` split mandatory: `ReportTable.tsx` + `ReportPartyRow.tsx` + `ReportSubtotalRow.tsx` (each ≤120 lines). Grand total uses `TableFooter` from `ui/table.tsx`.
- Blocked badge: `blocked === true` (boolean), not `=== "X"` (string).
- Money formatting: `"₹" + toLocaleString("en-IN", {maximumFractionDigits:2})` for INR fields; plain `toLocaleString()` for quantity fields.

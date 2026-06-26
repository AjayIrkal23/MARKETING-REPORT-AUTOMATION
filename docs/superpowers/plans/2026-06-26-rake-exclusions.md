# RAKE Drilldown Exclusions (browser-only, session-only) — Implementation Plan

> **For agentic workers:** execute task-by-task; steps use `- [ ]`.

**Goal:** Let a user uncheck rows inside a RAKE drilldown (merged/unmerged) so those rows are subtracted from the Total Rake Report number, dropped from the drilldown footer, and omitted from the `rake_totals` + `rake_breakdown` export sheets. Per-browser, per-generate-session only. Resets on regenerate. No persistence, no effect on other users.

**Architecture:** Exclusion state is plain React `useState` in `useReport` (page hook), keyed by `rake → { canonicalRowKey → matchQty }`. Identity = the existing 8-field merge key (already mirrored FE↔BE). Totals subtract client-side; export sends the exclusion set to `/report/export-combined` (now `GET|POST`) so the two server-built sheets honor it. Pivot/jsw/jvml/credit/transport-mode untouched.

**Tech Stack:** React 19 + TS (no new deps), FastAPI + openpyxl writers (no new deps).

## Global Constraints
- No new dependency. No persistence (no localStorage for exclusions). Plain `useState`.
- Identity key (8 fields, fixed order): `so_sales_org, distr_chnl, sales_office, sold_to_party, party_code, transport_mode, destination, customer_name`. Canonical = `(v ?? "").trim()` joined with `""`. Mirror byte-for-byte FE↔BE.
- Only the RAKE totals table + `rake_totals`/`rake_merged`/`rake_unmerged` export sheets change. transport_mode totals and all other sheets stay as-is.
- Single `jsw`/`jvml` mode: subtraction qty is stock-type-scoped (`stock_type == report_type`); `both` mode counts all. Clamp totals ≥ 0.

## Key decision (contradicts a literal reading of "no backend")
Export sheets are built server-side, so honoring exclusions in the file **requires** sending the exclusion set with the export request. It is transient (nothing stored, no other user affected) — consistent with "no persistence / no shared state". The on-screen totals + footer are pure client-side.

## Data flow
```mermaid
flowchart LR
  Gen[generate] --> Data[(useReport.data + exclusions={})]
  Data --> Totals[RakeTotalsTab\nshows rake_totals - excl]
  Data --> Drill[useRakeDrilldown\nrows/merged_rows]
  Drill --> Table[RakeDrilldownTable\ncheckboxes + live footer]
  Table -- toggle key+matchQty --> Excl[useReport.exclusions]
  Excl --> Totals
  Excl --> Export[confirmExport -> POST /report/export-combined\nbody.exclusions]
  Export --> BE[export_combined:\ntotals subtract + breakdown filter]
```

---

## Phase 1 — Backend: accept + apply exclusions (no FE dependency)

### Task 1: schema — exclusions body model
**Files:** Modify `backend/app/schemas/report.py`
- Add `class RakeExclusion(BaseModel): keys: list[str] = []; subtract: float = 0.0`
- Add `class CombinedExportBody(BaseModel): exclusions: dict[str, RakeExclusion] = {}` (rake → exclusion). Cap sizes defensively (`max_length`/manual guard) to stay small.
- [ ] Add models; keep `CombinedExportQuery` unchanged.

### Task 2: canonical key helper (single source on BE)
**Files:** Modify `backend/app/services/report/rake_drilldown.py`
- Add `def row_identity(row) -> str:` returning `"".join((getattr(row, f) or "").strip() ... )` over the 8 fields (reuse `_strip_or_none` semantics → just `(v or "").strip()` since payload values already stripped).
- Export it for reuse by the breakdown writer.
- [ ] Add helper; unit-self-check that `row_identity` of a merged row == of its constituent unmerged rows.

### Task 3: breakdown sheets honor exclusions
**Files:** Modify `backend/app/services/report/rake_breakdown_export.py`
- Thread an `exclusions: dict[str, set[str]] | None` param into `write_rake_breakdown_sheets`.
- After `rake_drilldown(...)` per rake: if rake in exclusions, `keys = exclusions[rake]`; filter `rows = [r for r in result.rows if row_identity(r) not in keys]` and `merged = [m for m in result.merged_rows if row_identity(m) not in keys]`.
- Recompute per-sheet `total_qty = round(sum(r.stock_quantity for r in surviving), 3)` (do NOT reuse `result.total_quantity`). Empty-after-filter → existing "(no rows)" note path.
- [ ] Filter + recompute total; merged & unmerged use the same key set.

### Task 4: totals sheet subtraction + wire body through service/controller/route
**Files:** Modify `backend/app/services/report/export_combined.py`, `controllers/report.py`, `routes/report.py`
- `export_combined(query, body: CombinedExportBody | None = None)`: build `excl_keys = {rake: set(e.keys) for ...}`; pass to `write_rake_breakdown_sheets`. For totals rows: `adj = {rake: max(0.0, qty - body.exclusions.get(rake).subtract)}`; pass adjusted `sorted(adj.items())` to `write_totals_sheet`.
- Controller `export_combined_controller`: add `body: CombinedExportBody | None = None` (FastAPI binds JSON body on POST, `None` on GET). Pass to `export_combined`. Keep existing query unknown-key whitelist.
- Route: `methods=["GET", "POST"]` for `/export-combined`.
- [ ] Thread body end-to-end; GET path stays identical (body None).

### Checkpoint: Backend
- [ ] `cd backend && ./.venv/bin/python -c "import app.main"` imports clean.
- [ ] Manual: POST `/report/export-combined?...&sheets=rake_totals,rake_unmerged` with a body excluding one key → that row gone from breakdown sheet, totals reduced. GET with no body → unchanged file.

---

## Phase 2 — Frontend: identity, state, UI, export

### Task 5: types + canonical key (mirror BE)
**Files:** Modify `frontend/src/types/report/report.ts`; add `frontend/src/components/report/rake-exclusions.ts`
- `rake-exclusions.ts`: `IDENTITY_FIELDS` (8), `rowKey(row): string` (`(v ?? "").trim()` join `""`), `RakeExclusions = Record<string, Record<string, number>>` (rake → key → matchQty), helpers `isExcluded`, `subtractFor(rake)`, `toExportBody(excl)`.
- `report.ts`: extend `CombinedExportParams` with `exclusions?: RakeExclusions` (optional).
- [ ] Add module + type; self-check `rowKey(mergedRow) === rowKey(matching rawRow)`.

### Task 6: exclusion state in useReport
**Files:** Modify `frontend/src/components/report/hooks/useReport.ts`
- `const [exclusions, setExclusions] = useState<RakeExclusions>({})` (NOT persisted).
- `generate()` success → also `setExclusions({})`.
- `toggleExclusion(rake, key, matchQty)`: add (store matchQty) or remove the key.
- `confirmExport(sheets)`: pass `exclusions` into `exportCombined(...)`.
- Return `exclusions`, `toggleExclusion`.
- [ ] Wire state + reset + export pass-through.

### Task 7: thread props through page → ReportSection
**Files:** Modify `frontend/src/pages/report/index.tsx`, `frontend/src/components/report/ReportSection.tsx`
- Pass `exclusions` + `onToggleExclusion` from `useReport` into `ReportSection`, then to `RakeTotalsTab` (read) and `RakeDrilldownTable` (read + toggle).
- ReportSection toggle handler computes `matchQty` from `drill.data.rows` (Σ where `rowKey==key && (report_type==='both' || stock_type===report_type)`).
- [ ] Prop wiring only.

### Task 8: totals tab subtraction
**Files:** Modify `frontend/src/components/report/RakeTotalsTab.tsx`
- For each rake row: `displayed = Math.max(0, rake_totals[rake] - Σ exclusions[rake] values)`. Recompute grand from displayed. transport_mode table unchanged.
- [ ] Subtract; keep click-through to drilldown.

### Task 9: drilldown checkboxes + live footer
**Files:** Modify `frontend/src/components/report/RakeDrilldownTable.tsx`
- Add leading checkbox column. Checked = `!isExcluded(exclusions, rake, rowKey(row))`. onChange → `onToggleExclusion(rake, rowKey(row), <matchQty via ReportSection handler>)`.
- Merged & unmerged use the same `rowKey` → toggle together (duplicates indistinguishable — ponytail-documented).
- Footer total = Σ stock_quantity of non-excluded visible rows (mode-aware), replacing `data.total_quantity`.
- [ ] Checkbox col + footer recompute.

### Task 10: export api + download POST
**Files:** Modify `frontend/src/api/report/export.ts`, `frontend/src/lib/download.ts`
- `downloadFromFetch(url, filename, init?)`: accept optional `{ method, body, headers }`.
- `exportCombined`: when `params.exclusions` has entries, POST same querystring URL with JSON body `{ exclusions: toExportBody(...) }`; else keep current GET-style call.
- [ ] POST-with-body path; GET unchanged when no exclusions.

### Checkpoint: Frontend
- [ ] `cd frontend && npm run lint && npm run build` clean.
- [ ] Manual: generate (both) → open Rake → uncheck rows → footer drops → back to totals → rake number drops → export → unchecked rows absent from totals+breakdown sheets, pivot/jsw/jvml/credit intact → Generate again → all rechecked.

---

## Phase 3 — Verify + docs
- [ ] Backend tests: extend `backend/tests/test_report_export.py` with an exclusion case (totals reduced + row dropped + GET unchanged).
- [ ] Update `backend/app/services/report/CLAUDE.md` + `frontend/src/components/report/CLAUDE.md`; re-sync root index (`dox_engine.py sweep .`).

## Risks
| Risk | Mit |
|---|---|
| FE/BE key drift | One documented canonicalization, mirrored; Task 2/5 self-checks |
| Single-mode over-subtract | stock-type-scoped matchQty + clamp ≥0 |
| Large exclusion set vs GET URL | POST body |
| Unmerged duplicate granularity | merge-level toggle (only robust option); documented |

## Assumptions
- "No backend" = no persistence / no shared state; a transient exclusions body on the export request is in-scope.
- Only RAKE totals + breakdown sheets/number react. transport_mode + other sheets untouched.
- Merged & unmerged share one exclusion set (8-field key); duplicate unmerged lines toggle together.

# RAKE Drill-down "Merged Data" View — Spec + Implementation Plan (backend-based)

> **For agentic workers:** implement task-by-task; steps use `- [ ]` checkboxes.
> Backend computes the merge; frontend only renders it. TDD on the backend helper.

**Goal:** In the Total Rake Report → RAKE drill-down, add two tabs — **Merged Data**
(default) and **Data not Merged** (the current 11-column view). The **backend** computes
the merged rows (collapsing rows that share an 8-field identity, summing Qty) and returns
them in the drill-down payload next to the raw rows; the frontend renders the tab the user
selects.

**Architecture:** Add `merged_rows` to `RakeDrilldownResponse`, computed server-side in
`services/report/rake_drilldown.py`. This mirrors the existing `ReportResponse`, which
already returns precomputed aggregations (`rake_totals`, `transport_mode_totals`) beside
raw `rows`. One fetch carries both row sets, so the tab toggle is instant (no refetch) and
**all merge logic is on the backend**.

**Tech Stack:** Backend FastAPI + Pydantic v2 + Beanie (pytest). Frontend React 19 + TS +
shadcn `Table`. No new dependency. No new endpoint, no new query param.

---

## Spec

### Objective
Users viewing a RAKE drill-down (e.g. "RAKE LONI24 · 24 rows · jsw + jvml") want a
consolidated view where rows for the same party/branch/route are merged with quantities
added, plus the ability to flip back to the raw per-row view. The consolidation is a
**server-side aggregation**, not a client-side transform.

### Merge key (8 fields, per product requirement)
`so_sales_org` (Sales Org) · `distr_chnl` (Distr Channel) · `sales_office` (BRANCH) ·
`sold_to_party` (Sold To Party) · `party_code` (Party Code) · `transport_mode`
(Transport Mode) · `destination` (Destination) · `customer_name` (Customer).
Rows sharing all 8 → one merged row; `stock_quantity` summed (rounded to 3 dp, matching
the existing WR-01 total rounding).

### Column treatment
- **Data not Merged** tab → current 11 columns from `rows`, unchanged.
- **Merged Data** tab → **9 columns** from `merged_rows` = the 8 merge-key fields (same
  left-to-right order, minus Source and Ship To Party) + **Qty**.
  `stock_type` (Source) and `ship_to_party` are **not** in the merge key and are **absent**
  from the merged row shape — they can vary within a merged group (decided 2026-06-26).

### API contract change (additive, backward-compatible)
`RakeDrilldownResponse` gains `merged_rows: list[RakeDrilldownMergedRow]`. New field is
additive (`api-and-interface-design`: prefer addition over modification); existing
consumers ignore it. No query-param or endpoint change; the controller whitelist is
untouched.

### Defaults & behaviour
- Default tab = **Merged Data**.
- Header "N rows" count reflects the active tab's row count.
- Footer **Total** = `data.total_quantity` in **both** tabs (sum is invariant under
  grouping — the cheap regression check).
- Tab switch is local UI state; no refetch.

### Boundaries
- **Always:** keep merge logic in the service; keep `RakeDrilldownTable.tsx` ≤ 250 lines.
- **Ask first:** any change to the drill-down query params or to `rows`/`total_quantity`.
- **Never:** compute the merge in the browser (this version does it server-side, per the
  user's instruction).

### Success criteria
1. Drill-down opens on **Merged Data**; toggle switches to the raw view and back.
2. Each merged row's Qty equals the summed Qty of its group's raw rows; merge ignores
   Source and Ship To Party.
3. `sum(merged_rows.stock_quantity) == sum(rows.stock_quantity) == total_quantity`.
4. Backend: `pytest tests/test_rake_drilldown_merge.py` passes.
5. Frontend: `npm run build` + `npm run lint` pass.

---

## File Structure

| File | Responsibility |
|------|----------------|
| **Modify** `backend/app/schemas/report.py` | Add `RakeDrilldownMergedRow`; add `merged_rows` to `RakeDrilldownResponse`. |
| **Modify** `backend/app/services/report/rake_drilldown.py` | Add `_merge_rows()`; populate `merged_rows` in both return sites. |
| **Create** `backend/tests/test_rake_drilldown_merge.py` | Unit tests for `_merge_rows`. |
| **Modify** `frontend/src/types/report/report.ts` | Add `RakeDrilldownMergedRow`; add `merged_rows` to `RakeDrilldownResponse`. |
| **Modify** `frontend/src/components/report/RakeDrilldownTable.tsx` | Tab toggle; render `rows` or `merged_rows`. |
| **Modify** `backend/app/services/report/CLAUDE.md` + `frontend/src/components/report/CLAUDE.md` | Doc the merged view (Phase 7). |

No controller/route/export change.

---

## Task 1: Backend schema — `RakeDrilldownMergedRow` + `merged_rows`

**Files:** Modify `backend/app/schemas/report.py`

- [ ] **Step 1:** After the `RakeDrilldownRow` class, add the merged-row DTO:

```python
class RakeDrilldownMergedRow(BaseModel):
    """A merged drill-down row: the 8-field business identity + summed quantity.

    Source (stock_type) and Ship To Party are intentionally absent — they are not
    part of the merge key and can vary within a merged group.
    """

    so_sales_org: str | None       # Sales Org
    distr_chnl: str | None         # Distr Channel
    sales_office: str | None       # rendered as BRANCH
    sold_to_party: str | None      # Sold to party
    party_code: str | None         # normalized display code
    transport_mode: str | None     # from CustomerCode.transport_mode
    destination: str | None        # from CustomerCode.destination
    customer_name: str | None      # mapped customer
    stock_quantity: float          # Σ stock_quantity for the merged group
```

- [ ] **Step 2:** Add the field to `RakeDrilldownResponse` (after `rows`):

```python
    rows: list[RakeDrilldownRow]
    merged_rows: list[RakeDrilldownMergedRow] = []  # rows collapsed by 8-field identity
    total_quantity: float
```

- [ ] **Step 3:** Verify import — `cd backend && ./.venv/bin/python -c "import app.schemas.report"`. Expected: no error.

---

## Task 2: Backend service — `_merge_rows` (TDD)

**Files:**
- Create `backend/tests/test_rake_drilldown_merge.py`
- Modify `backend/app/services/report/rake_drilldown.py`

**Interfaces:**
- Produces: `_merge_rows(rows: list[RakeDrilldownRow]) -> list[RakeDrilldownMergedRow]`.

- [ ] **Step 1 (RED): write the failing test**

```python
"""Unit tests for the RAKE drill-down merge (8-field identity + summed qty)."""

from app.schemas.report import RakeDrilldownRow
from app.services.report.rake_drilldown import _merge_rows


def _row(stock_type="jsw", party="40007137", ship="Mittal Agencies", qty=10.0):
    return RakeDrilldownRow(
        stock_type=stock_type,
        so_sales_org="1001",
        distr_chnl="Retail",
        sold_to_party="Mittal Agencies",
        sales_office="Pune",
        party_code=party,
        ship_to_party=ship,
        transport_mode="RAKE",
        destination="Pune",
        customer_name="Mittal agencies",
        stock_quantity=qty,
    )


def test_merge_sums_identity_ignoring_source_and_ship_to():
    rows = [
        _row(ship="Mittal Agencies", qty=31.3),
        _row(ship="VST INFRA", qty=31.0),       # different ship_to → still merges
        _row(stock_type="jvml", qty=10.0),       # different source → still merges
    ]
    merged = _merge_rows(rows)
    assert len(merged) == 1
    assert merged[0].stock_quantity == 72.3
    # dropped columns are absent from the merged shape
    assert not hasattr(merged[0], "stock_type")
    assert not hasattr(merged[0], "ship_to_party")


def test_merge_keeps_distinct_party_codes_separate():
    merged = _merge_rows([_row(party="40007137", qty=5.0), _row(party="40020381", qty=3.0)])
    assert len(merged) == 2


def test_merge_total_is_invariant():
    rows = [_row(qty=1.1), _row(party="X", qty=2.2), _row(stock_type="jvml", qty=3.3)]
    merged = _merge_rows(rows)
    assert round(sum(m.stock_quantity for m in merged), 3) == 6.6


def test_merge_empty():
    assert _merge_rows([]) == []
```

- [ ] **Step 2 (RED): run it, confirm it fails** — `cd backend && ./.venv/bin/python -m pytest tests/test_rake_drilldown_merge.py -v`. Expected: `ImportError`/`AttributeError` on `_merge_rows`.

- [ ] **Step 3 (GREEN): implement `_merge_rows`** — edit `rake_drilldown.py`. Add `RakeDrilldownMergedRow` to the schema import, and add the helper above `async def rake_drilldown`:

Update the import block:
```python
from ...schemas.report import (
    RakeDrilldownMergedRow,
    RakeDrilldownQuery,
    RakeDrilldownResponse,
    RakeDrilldownRow,
)
```

Add the helper (place after `_STOCK_MODELS`, before `rake_drilldown`):
```python
def _merge_rows(rows: list[RakeDrilldownRow]) -> list[RakeDrilldownMergedRow]:
    """Collapse rows sharing the same 8-field identity into one, summing quantity.

    Merge key (product spec): so_sales_org, distr_chnl, sales_office (BRANCH),
    sold_to_party, party_code, transport_mode, destination, customer_name. NOT in
    the key — and dropped from the merged shape — are stock_type (Source) and
    ship_to_party, which can vary within a merged group. The summed quantity is
    invariant under grouping, so Σ merged == Σ rows == total_quantity.
    """
    groups: dict[tuple, RakeDrilldownMergedRow] = {}
    for r in rows:
        key = (
            r.so_sales_org,
            r.distr_chnl,
            r.sales_office,
            r.sold_to_party,
            r.party_code,
            r.transport_mode,
            r.destination,
            r.customer_name,
        )
        existing = groups.get(key)
        if existing is None:
            groups[key] = RakeDrilldownMergedRow(
                so_sales_org=r.so_sales_org,
                distr_chnl=r.distr_chnl,
                sales_office=r.sales_office,
                sold_to_party=r.sold_to_party,
                party_code=r.party_code,
                transport_mode=r.transport_mode,
                destination=r.destination,
                customer_name=r.customer_name,
                stock_quantity=r.stock_quantity,
            )
        else:
            existing.stock_quantity += r.stock_quantity

    merged = list(groups.values())
    for m in merged:
        # Round once at the end so float order doesn't drift the displayed sum (WR-01).
        m.stock_quantity = round(m.stock_quantity, 3)
    merged.sort(
        key=lambda m: (
            m.so_sales_org or "",
            m.distr_chnl or "",
            m.sales_office or "",
            m.sold_to_party or "",
            m.party_code or "",
            m.transport_mode or "",
            m.destination or "",
            m.customer_name or "",
        )
    )
    return merged
```

- [ ] **Step 4 (GREEN): populate `merged_rows` in both return sites** of `rake_drilldown`.

Empty-codes early return — add `merged_rows=[]`:
```python
        return RakeDrilldownResponse(
            rake=target,
            date=query.date,
            region_id=query.region_id,
            region_name=region_name,
            days_filter=query.days,
            rows=[],
            merged_rows=[],
            total_quantity=0.0,
        )
```

Main return — add `merged_rows=_merge_rows(rows)` (after `rows=rows`):
```python
    return RakeDrilldownResponse(
        rake=target,
        date=query.date,
        region_id=query.region_id,
        region_name=region_name,
        days_filter=query.days,
        rows=rows,
        merged_rows=_merge_rows(rows),
        total_quantity=round(total, 3),
    )
```

- [ ] **Step 5 (GREEN): run tests** — `cd backend && ./.venv/bin/python -m pytest tests/test_rake_drilldown_merge.py -v`. Expected: 4 passed.

- [ ] **Step 6: regression** — `./.venv/bin/python -m pytest tests/ -q`. Expected: no new failures.

- [ ] **Step 7: commit** — `git add backend/app/schemas/report.py backend/app/services/report/rake_drilldown.py backend/tests/test_rake_drilldown_merge.py && git commit -m "feat(report): backend-computed merged rows for RAKE drill-down"`

---

## Task 3: Frontend types — `RakeDrilldownMergedRow` + `merged_rows`

**Files:** Modify `frontend/src/types/report/report.ts`

- [ ] **Step 1:** After the `RakeDrilldownRow` interface, add:

```ts
/** A merged drill-down row: 8-field identity + summed quantity (Source & Ship To Party dropped). */
export interface RakeDrilldownMergedRow {
  so_sales_org: string | null      // Sales Org
  distr_chnl: string | null        // Distr Channel
  sales_office: string | null      // rendered as BRANCH
  sold_to_party: string | null     // Sold to party
  party_code: string | null        // normalized display code
  transport_mode: string | null    // from CustomerCode.transport_mode
  destination: string | null       // from CustomerCode.destination
  customer_name: string | null     // mapped customer
  stock_quantity: number           // Σ stock_quantity for the merged group
}
```

- [ ] **Step 2:** Add `merged_rows` to `RakeDrilldownResponse` (after `rows`):

```ts
  rows: RakeDrilldownRow[]
  merged_rows: RakeDrilldownMergedRow[]   // rows collapsed by 8-field identity (server-computed)
  total_quantity: number
```

---

## Task 4: Frontend component — tab toggle rendering `rows` / `merged_rows`

**Files:** Modify `frontend/src/components/report/RakeDrilldownTable.tsx` (full replacement)

- [ ] **Step 1: replace the file with:**

```tsx
import { useState } from "react"
import { ArrowLeft, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { RakeDrilldownResponse } from "@/types/report/report"

type Col = { key: string; label: string; right?: boolean }

const COLS_RAW: Col[] = [
  { key: "stock_type", label: "Source" },
  { key: "so_sales_org", label: "Sales Org" },
  { key: "distr_chnl", label: "Distr Channel" },
  { key: "sales_office", label: "BRANCH" },
  { key: "sold_to_party", label: "Sold To Party" },
  { key: "party_code", label: "Party Code" },
  { key: "ship_to_party", label: "Ship To Party" },
  { key: "transport_mode", label: "Transport Mode" },
  { key: "destination", label: "Destination" },
  { key: "customer_name", label: "Customer" },
  { key: "stock_quantity", label: "Qty", right: true },
]

// Merged view drops the two columns NOT in the merge key (Source, Ship To Party).
const COLS_MERGED: Col[] = COLS_RAW.filter(
  (c) => c.key !== "stock_type" && c.key !== "ship_to_party",
)

const fmtQty = (n: number) => n.toLocaleString("en-IN")

type Mode = "merged" | "raw"

const TABS: readonly [Mode, string][] = [
  ["merged", "Merged Data"],
  ["raw", "Data not Merged"],
]

export function RakeDrilldownTable({
  rake,
  data,
  loading,
  error,
  onBack,
}: {
  rake: string
  data: RakeDrilldownResponse | null
  loading: boolean
  error: string | null
  onBack: () => void
}) {
  const [mode, setMode] = useState<Mode>("merged")

  const cols = mode === "merged" ? COLS_MERGED : COLS_RAW
  const rows = (
    mode === "merged" ? (data?.merged_rows ?? []) : (data?.rows ?? [])
  ) as Record<string, string | number | null>[]

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={onBack}>
          <ArrowLeft className="size-4 mr-2" aria-hidden />
          Back
        </Button>
        <h3 className="text-sm font-semibold text-foreground">
          RAKE <span className="text-primary">{rake}</span>
          {data ? (
            <span className="ml-2 font-normal text-muted-foreground">
              {rows.length} row{rows.length === 1 ? "" : "s"} · jsw + jvml
            </span>
          ) : null}
        </h3>
      </div>

      {/* Merged / Data not Merged toggle */}
      <div className="inline-flex w-fit rounded-lg border bg-muted/30 p-0.5">
        {TABS.map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setMode(value)}
            className={
              "rounded-md px-3 py-1.5 text-xs font-medium transition-colors " +
              (mode === value
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground")
            }
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" aria-hidden />
          Loading rows…
        </div>
      ) : error ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-6 text-center text-sm text-destructive">
          {error}
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <Table containerClassName="max-h-[60vh] overflow-auto">
            <TableHeader>
              <TableRow className="bg-muted/50">
                {cols.map((c) => (
                  <TableHead
                    key={c.key}
                    className={c.right ? "text-right" : undefined}
                  >
                    {c.label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length > 0 ? (
                rows.map((row, i) => (
                  <TableRow key={i} className="hover:bg-muted/30">
                    {cols.map((c) => {
                      if (c.key === "stock_quantity") {
                        return (
                          <TableCell
                            key={c.key}
                            className="text-right tabular-nums"
                          >
                            {fmtQty(Number(row.stock_quantity ?? 0))}
                          </TableCell>
                        )
                      }
                      if (c.key === "stock_type") {
                        return (
                          <TableCell
                            key={c.key}
                            className="uppercase text-xs font-medium text-muted-foreground"
                          >
                            {row.stock_type}
                          </TableCell>
                        )
                      }
                      return (
                        <TableCell key={c.key}>{row[c.key] ?? "—"}</TableCell>
                      )
                    })}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={cols.length}
                    className="py-10 text-center text-sm text-muted-foreground"
                  >
                    No stock rows for this RAKE on {data?.date ?? "this date"}.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
            {rows.length > 0 ? (
              <TableFooter>
                <TableRow className="bg-muted/50">
                  <TableCell colSpan={cols.length - 1} className="font-semibold">
                    Total
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">
                    {fmtQty(data?.total_quantity ?? 0)}
                  </TableCell>
                </TableRow>
              </TableFooter>
            ) : null}
          </Table>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: build** — `cd frontend && npm run build`. Expected: success.
- [ ] **Step 3: lint** — `npm run lint`. Expected: no new errors.
- [ ] **Step 4: manual check** — open a RAKE drill-down with repeated party codes:
  default tab **Merged Data** (9 cols, fewer rows); footer **Total** identical on both
  tabs; toggle has no refetch.
- [ ] **Step 5: commit** — `git add frontend/src/types/report/report.ts frontend/src/components/report/RakeDrilldownTable.tsx && git commit -m "feat(report): merged/unmerged tabs in RAKE drill-down"`

---

## Task 5: Docs (Phase 7)

**Files:** `backend/app/services/report/CLAUDE.md`, `frontend/src/components/report/CLAUDE.md`

- [ ] Backend doc: note `rake_drilldown.py` now returns `merged_rows` via `_merge_rows`
  (8-key merge dropping Source + Ship To Party; total invariant).
- [ ] Frontend doc: note `RakeDrilldownTable` has Merged (default) / Data-not-Merged tabs;
  merged rows come from `data.merged_rows` (server-computed).
- [ ] Re-sync root index — `python3 ~/.claude/hooks/dox_engine.py sweep .`

---

## Architecture Decisions
- **Backend-computed merge (per user instruction).** `merged_rows` rides in the existing
  payload, exactly like `ReportResponse` already returns `rake_totals` /
  `transport_mode_totals` aggregations. No new endpoint or query param; additive field.
- **Both row sets in one response** → instant tab toggle, no refetch. Drill-down is a small
  un-paginated payload, so the extra array is negligible.
- **`RakeDrilldownMergedRow` is its own DTO** (not nullable `stock_type`), so the dropped
  columns are simply absent — cleaner than sentinel values.
- **One generic frontend table, two column sets** keeps `RakeDrilldownTable.tsx` ~185 lines.

## Risks and Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| Float drift in summed Qty | Low | `_merge_rows` rounds to 3 dp; footer stays `total_quantity`. |
| `merged_rows` omitted by an old client | Low | Field is additive; default `[]`; the FE reads `data?.merged_rows ?? []`. |
| Generic FE renderer reads a missing key | Low | `COLS_MERGED` excludes `stock_type`/`ship_to_party`. |

## Open Questions
None — backend-based + column treatment confirmed 2026-06-26.

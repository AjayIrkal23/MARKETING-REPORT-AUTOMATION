<!-- dox:child v1 -->
# `frontend/src/components/report/hooks/` — Report hooks

Feature hooks for the Report JSW/JVML page.

## What lives here

`useReport` owns all page state (inputs, generation trigger, export, optional
column visibility). `useRakeDrilldown` owns the RAKE drill-down (open RAKE,
fetched jsw+jvml rows, loading/error) — derives its query from the report
(date/region/days) so the drill-down matches what was generated.

## Local conventions

- Generation is manual — do not auto-fetch on input change.
- Column visibility is the only client-side view config.
- Drill-down fetches BOTH jsw + jvml regardless of the report's `report_type`
  (the RAKE drill-down is a union view — backend `/report/rake-drilldown`).

## Key files

| File | Role |
|------|------|
| `useReport.ts` | All Report page state + generate/export. |
| `useRakeDrilldown.ts` | RAKE drill-down state + fetch (stale-guarded via `fetchIdRef`). |

## Gotchas / fragile spots

- The pivot relies on backend sort order for client-side grouping.
- `inputs`, the generated `data`, and `visibleCols` are persisted to localStorage (`mra:report:{inputs,data,cols}`, sliding 1h TTL via `@/hooks/usePersistedState`). `data` is stored too — because generation is manual (no auto-refetch on mount), the generated report would otherwise be lost on navigation; it survives away-and-back and resets only after >1h idle. `ReportSection` likewise persists the active tab (`mra:report:tab`).

## Up / down

- Parent: [`../CLAUDE.md`](../CLAUDE.md)
- Children: none
- Related repo docs: [`../../../../../frontend_docs/COMPONENTS.md`](../../../../../frontend_docs/COMPONENTS.md)

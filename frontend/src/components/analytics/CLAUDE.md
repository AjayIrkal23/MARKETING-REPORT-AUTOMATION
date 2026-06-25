<!-- dox:child v1 -->
# `frontend/src/components/analytics/` — Analytics dashboard UI

Components that render the analytics page: filter bar, KPI cards, and chart
layout. State lives in `hooks/useAnalyticsDashboard.ts`; chart primitives live in
`charts/`.

## What lives here

Feature components for the stock-analytics screen. Pages import and wire these
components; no API calls happen here directly.

## Local conventions

- One file per concern; keep components under 250 lines.
- No API calls inside components — use the feature hook.
- Reuse shared primitives from `components/ui/` and `components/common/`.

## Key files

| File | Role |
|------|------|
| `AnalyticsDashboard.tsx` | Main page section wiring filters, KPI cards, and charts. |
| `AnalyticsFilters.tsx` | Date range, report type, region, QA-hold filter, and collapsible dimension multi-selects. |
| `AnalyticsKpiCards.tsx` | Total stock, NCO Yes+DO, and unique-customer KPI cards. |

## Gotchas / fragile spots

- `AnalyticsFilters` converts between the `dd-MM-yyyy` wire format and ISO
  internally for the date picker.
- The filter bar is collapsed by default; the active-filter badge counts only
  dimension filters, not date/report/region/QA-hold selections.
- The customer-wise chart is rendered by a separate horizontal-bar component that
  can grow up to 1200 px tall.

## Up / down

- Parent: [`../CLAUDE.md`](../CLAUDE.md)
- Children: [`charts/`](charts/CLAUDE.md) · [`hooks/`](hooks/CLAUDE.md)
- Related repo docs: [`../../../../frontend_docs/COMPONENTS.md`](../../../../frontend_docs/COMPONENTS.md) · [`../../../../frontend_docs/STYLING.md`](../../../../frontend_docs/STYLING.md)

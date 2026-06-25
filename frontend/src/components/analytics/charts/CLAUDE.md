<!-- dox:child v1 -->
# `frontend/src/components/analytics/charts/` — Analytics chart components

Recharts-based chart components used by the analytics dashboard.

## What lives here

One component per chart type, plus a shared color helper. Each component consumes
`AnalyticsPoint[]` and is styled with shadcn/ui `ChartContainer`.

## Local conventions

- Keep charts thin: formatting and layout only; no data fetching.
- Colors come from `chart-colors.ts` so palettes stay consistent and overflow
  categories get generated HSL values.

## Key files

| File | Role |
|------|------|
| `AnalyticsBarChart.tsx` | Vertical bar chart used for RAKE totals and distribution channel. |
| `AnalyticsHorizontalBarChart.tsx` | Horizontal bar chart for customer-wise totals; reverses order and caps height. |
| `AnalyticsPieChart.tsx` | Pie/donut chart used for transport mode and segment. |
| `chart-colors.ts` | `getChartColor` and `buildChartConfig` helpers. |

## Gotchas / fragile spots

- Horizontal-bar labels are truncated to 26 characters to prevent overlap.
- Pie-chart slice labels are hidden when the slice is below 8% of the total.
- Customer-wise chart height is computed as `min(max(count * 40 + 80, 320), 1200)`;
  very large customer counts still produce a tall card.

## Up / down

- Parent: [`../CLAUDE.md`](../CLAUDE.md)
- Children: none
- Related repo docs: [`../../../../../frontend_docs/COMPONENTS.md`](../../../../../frontend_docs/COMPONENTS.md)

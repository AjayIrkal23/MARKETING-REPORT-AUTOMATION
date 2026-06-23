<!-- dox:child v1 -->
# `frontend/src/components/dashboard/` — Dashboard UI

Components for the home dashboard page.

## What lives here

Status cards and analytics placeholders for the `/home` route. Data comes from `hooks/useDashboardSummary.ts`.

## Local conventions

- Cards are config-driven via `report-card-config.ts`.
- Analytics sections are currently placeholders.

## Key files

| File | Role |
|------|------|
| `ReportStatusCard.tsx` | Per-report ingestion status card. |
| `AnalyticsComingSoon.tsx` | Placeholder for future analytics. |
| `report-card-config.ts` | Card layout configuration. |
| `hooks/useDashboardSummary.ts` | Fetches today's ingestion summary. |

## Gotchas / fragile spots

- Dashboard summary has no query params — it always reflects 'today'.

## Up / down

- Parent: [`../CLAUDE.md`](../CLAUDE.md)
- Children: [`hooks/`](hooks/CLAUDE.md)
- Related repo docs: [`../../../../frontend_docs/COMPONENTS.md`](../../../../frontend_docs/COMPONENTS.md)

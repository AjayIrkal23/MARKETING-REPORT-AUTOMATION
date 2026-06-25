<!-- dox:child v1 -->
# `frontend/src/types/analytics/` — Analytics TypeScript types

TypeScript contracts for the analytics dashboard; mirror of
`backend/app/schemas/analytics.py`.

## What lives here

Domain types used by API modules, hooks, and components. No types should be
scattered in components; import from here.

## Local conventions

- One file per domain concern.
- Keep wire types (API contracts) separate from UI-specific helper types.
- Keep string unions in sync with backend `Literal` types.

## Key files

| File | Role |
|------|------|
| `dashboard.ts` | `AnalyticsQuery`, `AnalyticsDashboardData`, `AnalyticsSeries`, `AnalyticsPoint`, `AnalyticsFiltersState`, and option-query types. |

## Gotchas / fragile spots

- Date strings are `dd-MM-yyyy` to match the backend; the date picker works in
  ISO, so conversion happens at the component layer.
- `ReportType` and `DaysFilter` are narrow string unions; changes must be
  reflected in both backend schemas and frontend types.

## Up / down

- Parent: [`../CLAUDE.md`](../CLAUDE.md)
- Children: none
- Related repo docs: [`../../../../frontend_docs/TYPES.md`](../../../../frontend_docs/TYPES.md)

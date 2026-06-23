<!-- dox:child v1 -->
# `frontend/src/pages/dashboard/home/` — Home dashboard page

`/home` route page.

## What lives here

Landing page after login. Renders today's ingestion status cards and placeholder analytics sections.

## Local conventions

- Data comes from `useDashboardSummary`.
- Cards are config-driven.

## Key files

| File | Role |
|------|------|
| `index.tsx` | Home page component. |

## Gotchas / fragile spots

- The summary is always for today; there is no date picker on this page.

## Up / down

- Parent: [`../CLAUDE.md`](../CLAUDE.md)
- Children: none
- Related repo docs: [`../../../../../frontend_docs/ROUTING.md`](../../../../../frontend_docs/ROUTING.md)

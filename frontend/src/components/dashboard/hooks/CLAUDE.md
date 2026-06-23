<!-- dox:child v1 -->
# `frontend/src/components/dashboard/hooks/` — Dashboard hooks

Feature hooks for the dashboard page.

## What lives here

Contains `useDashboardSummary`, a read-only hook that fetches today's per-report ingestion status.

## Local conventions

- No query state — the backend always returns today's summary.
- Race-safe refetch via `fetchIdRef`.

## Key files

| File | Role |
|------|------|
| `useDashboardSummary.ts` | Today's ingestion summary state. |

## Gotchas / fragile spots

- Cards refetch manually; there is no auto-polling yet.

## Up / down

- Parent: [`../CLAUDE.md`](../CLAUDE.md)
- Children: none
- Related repo docs: [`../../../../../frontend_docs/COMPONENTS.md`](../../../../../frontend_docs/COMPONENTS.md)

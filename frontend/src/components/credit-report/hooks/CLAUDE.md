<!-- dox:child v1 -->
# `frontend/src/components/credit-report/hooks/` — Credit report hooks

Feature hooks for the Credit Report page.

## What lives here

Contains `useCreditReportList`, which owns query state, server state, and the view dialog.

## Local conventions

- Default date is seeded to today.
- Use a single `setFilter` for the 6 filter keys.

## Key files

| File | Role |
|------|------|
| `useCreditReportList.ts` | All Credit Report list state. |

## Gotchas / fragile spots

- The blocked/balance selects are fixed enums, not async options.
- `query` is persisted to localStorage (`mra:credit-report:query`, sliding 1h TTL via `@/hooks/usePersistedState`) so filters/date/page/sort survive navigation; the today-date default applies only when no fresh entry exists. Rows aren't persisted — the refetch effect repopulates them on remount.

## Up / down

- Parent: [`../CLAUDE.md`](../CLAUDE.md)
- Children: none
- Related repo docs: [`../../../../../frontend_docs/COMPONENTS.md`](../../../../../frontend_docs/COMPONENTS.md)

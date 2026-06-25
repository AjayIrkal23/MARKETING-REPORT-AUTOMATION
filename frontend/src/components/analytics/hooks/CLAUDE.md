<!-- dox:child v1 -->
# `frontend/src/components/analytics/hooks/` — Analytics feature hooks

Feature-specific React hooks for the analytics dashboard.

## What lives here

State and fetch logic for the analytics page. This folder is intentionally small;
add new analytics hooks here only when they are reused across multiple
components.

## Local conventions

- One hook per feature concern.
- Keep mutations and fetch state in the hook, not in the table or card
  components.
- Mirror the existing list-page hook pattern (`fetchIdRef` race guard).

## Key files

| File | Role |
|------|------|
| `useAnalyticsDashboard.ts` | Date range, filter state, dashboard fetch with race guard, and refetch. |

## Gotchas / fragile spots

- Default date range is today→today; callers must set a meaningful range.
- Uses a `fetchIdRef` race guard like other list-page hooks — stale responses are
  dropped, but error/loading state transitions are still visible.

## Up / down

- Parent: [`../CLAUDE.md`](../CLAUDE.md)
- Children: none
- Related repo docs: [`../../../../../../frontend_docs/STATE_MANAGEMENT.md`](../../../../../../frontend_docs/STATE_MANAGEMENT.md)

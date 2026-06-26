<!-- dox:child v1 -->
# `frontend/src/components/jsw-stock/hooks/` — JSW stock hooks

Feature hooks for the JSW Stock List page.

## What lives here

Contains `useJswStockList`, which owns query state, server state, export state, and the view dialog.

## Local conventions

- Use `setDate` for the single report-date filter (not a range).
- `setFilter` handles the 4 field filters + region in one call.

## Key files

| File | Role |
|------|------|
| `useJswStockList.ts` | All JSW Stock list state + export. |

## Gotchas / fragile spots

- Export uses the same query params as the current list view.
- `query` is persisted to localStorage (`mra:jsw-stock:query`, sliding 1h TTL via `@/hooks/usePersistedState`) so filters/date/page/sort survive navigation; the today-date default applies only when no fresh entry exists. Rows are NOT persisted — the refetch effect repopulates them from the restored query on remount.

## Up / down

- Parent: [`../CLAUDE.md`](../CLAUDE.md)
- Children: none
- Related repo docs: [`../../../../../frontend_docs/COMPONENTS.md`](../../../../../frontend_docs/COMPONENTS.md)

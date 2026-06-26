<!-- dox:child v1 -->
# `frontend/src/components/jvml-stock/hooks/` — JVML stock hooks

Feature hooks for the JVML Stock List page.

## What lives here

Contains `useJvmlStockList`, mirroring `useJswStockList` for the JVML domain.

## Local conventions

- Use `setDate` for the single report-date filter.
- `setFilter` handles the 4 field filters + region in one call.

## Key files

| File | Role |
|------|------|
| `useJvmlStockList.ts` | All JVML Stock list state + export. |

## Gotchas / fragile spots

- Any change to the JSW list hook should be evaluated for JVML parity.
- `query` is persisted to localStorage (`mra:jvml-stock:query`, sliding 1h TTL via `@/hooks/usePersistedState`) so filters/date/page/sort survive navigation; mirror any JSW persistence change here. Rows aren't persisted — the refetch effect repopulates them on remount.

## Up / down

- Parent: [`../CLAUDE.md`](../CLAUDE.md)
- Children: none
- Related repo docs: [`../../../../../frontend_docs/COMPONENTS.md`](../../../../../frontend_docs/COMPONENTS.md)

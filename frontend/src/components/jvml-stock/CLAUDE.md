<!-- dox:child v1 -->
# `frontend/src/components/jvml-stock/` — JVML stock UI

Components for the JVML Stock List page.

## What lives here

Read-only server-driven table, toolbar, pagination, and detail dialog for the JVML Stock (99) report. Nearly identical in structure to JSW Stock List.

## Local conventions

- No mutations — JVML Stock is read-only.
- Shares the same 5-filter contract as JSW Stock List.

## Key files

| File | Role |
|------|------|
| `JvmlStockTable.tsx` | Sortable server-driven table. |
| `JvmlStockTableToolbar.tsx` | Date picker + filters. |
| `JvmlStockFilters.tsx` | Inline async filter comboboxes. |
| `JvmlStockTablePagination.tsx` | Page/limit controls. |
| `ViewJvmlStockDialog.tsx` | Read-only detail dialog. |
| `jvml-stock-fields.ts` | Config-driven field registry for the view dialog. |
| `hooks/useJvmlStockList.ts` | All JVML Stock list state. |

## Gotchas / fragile spots

- Keep filter keys and behavior in sync with JSW Stock List.

## Up / down

- Parent: [`../CLAUDE.md`](../CLAUDE.md)
- Children: [`hooks/`](hooks/CLAUDE.md)
- Related repo docs: [`../../../../frontend_docs/COMPONENTS.md`](../../../../frontend_docs/COMPONENTS.md)

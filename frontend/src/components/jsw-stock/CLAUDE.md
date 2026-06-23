<!-- dox:child v1 -->
# `frontend/src/components/jsw-stock/` — JSW stock UI

Components for the JSW Stock List page.

## What lives here

Read-only server-driven table, toolbar, pagination, and detail dialog for the JSW current-stock report. State lives in `hooks/useJswStockList.ts`.

## Local conventions

- No mutations — JSW Stock is read-only.
- Filter surface: single date + 4 async per-field filters + region.

## Key files

| File | Role |
|------|------|
| `JswStockTable.tsx` | Sortable server-driven table. |
| `JswStockTableToolbar.tsx` | Date picker + filters. |
| `JswStockFilters.tsx` | Inline async filter comboboxes. |
| `JswStockTablePagination.tsx` | Page/limit controls. |
| `ViewJswStockDialog.tsx` | Read-only detail dialog. |
| `jsw-stock-fields.ts` | Config-driven field registry for the view dialog. |
| `hooks/useJswStockList.ts` | All JSW Stock list state. |

## Gotchas / fragile spots

- Default date is today; clearing it shows all report dates.

## Up / down

- Parent: [`../CLAUDE.md`](../CLAUDE.md)
- Children: [`hooks/`](hooks/CLAUDE.md)
- Related repo docs: [`../../../../frontend_docs/COMPONENTS.md`](../../../../frontend_docs/COMPONENTS.md)

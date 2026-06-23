<!-- dox:child v1 -->
# `frontend/src/components/admin/customer-codes/hooks/` — Customer code hooks

Feature hooks for the Customer Code Management page.

## What lives here

Contains `useCustomerCodeManagement` (query/server/dialog/bulk-selection) and `useCustomerCodeMutations` (delete and mutation helpers).

## Local conventions

- Use a single `setFilter` callback for all per-field filters.
- Row selection is local to the current page.

## Key files

| File | Role |
|------|------|
| `useCustomerCodeManagement.ts` | Query state, fetch, filters, dialogs, row selection. |
| `useCustomerCodeMutations.ts` | Delete mutation and loading/error handling. |

## Gotchas / fragile spots

- Bulk-delete endpoint accepts up to 100 ids; the hook should cap or chunk larger selections.

## Up / down

- Parent: [`../CLAUDE.md`](../CLAUDE.md)
- Children: none
- Related repo docs: [`../../../../../../frontend_docs/COMPONENTS.md`](../../../../../../frontend_docs/COMPONENTS.md)

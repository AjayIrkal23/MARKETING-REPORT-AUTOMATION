<!-- dox:child v1 -->
# `frontend/src/pages/admin/customer-codes/` — Customer codes page

`/admin/customer-codes` route page.

## What lives here

Thin orchestrator for the Customer Code Management screen: table, toolbar, filters, dialogs, and import flow.

## Local conventions

- Delegates all state to `useCustomerCodeManagement` and `useCustomerCodeMutations`.

## Key files

| File | Role |
|------|------|
| `index.tsx` | Customer Code Management page component. |

## Gotchas / fragile spots

- Route is guarded by `AdminRoute`.

## Up / down

- Parent: [`../CLAUDE.md`](../CLAUDE.md)
- Children: none
- Related repo docs: [`../../../../../frontend_docs/ROUTING.md`](../../../../../frontend_docs/ROUTING.md)

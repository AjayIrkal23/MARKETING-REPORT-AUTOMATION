<!-- dox:child v1 -->
# `frontend/src/types/credit-report/` — Credit report domain types

TypeScript types for the Credit Report feature.

## What lives here

Contains the row contract, query params, filter enums, and UI state types.

## Local conventions

- Money fields are numbers; formatting happens in components.
- Blocked/balance filter enums are frontend-defined and mapped to backend values.

## Key files

| File | Role |
|------|------|
| `credit-report.ts` | Credit report row and query types. |
| `credit-report-ui.ts` | Credit report UI state types. |

## Gotchas / fragile spots

- `customer_name` is native to the file — no customer-code mapping here.

## Up / down

- Parent: [`../CLAUDE.md`](../CLAUDE.md)
- Children: none
- Related repo docs: [`../../../../frontend_docs/TYPES.md`](../../../../frontend_docs/TYPES.md)

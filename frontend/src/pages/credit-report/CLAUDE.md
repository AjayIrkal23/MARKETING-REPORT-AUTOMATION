<!-- dox:child v1 -->
# `frontend/src/pages/credit-report/` — Credit report page

`/credit-report` route page.

## What lives here

Thin orchestrator for the Credit Report list page: table, toolbar, pagination, and detail dialog.

## Local conventions

- All state comes from `useCreditReportList`.

## Key files

| File | Role |
|------|------|
| `index.tsx` | Credit Report page component. |

## Gotchas / fragile spots

- Route is protected but available to all authenticated users (not admin-only).

## Up / down

- Parent: [`../CLAUDE.md`](../CLAUDE.md)
- Children: none
- Related repo docs: [`../../../../frontend_docs/ROUTING.md`](../../../../frontend_docs/ROUTING.md)

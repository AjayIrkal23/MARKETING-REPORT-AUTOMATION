<!-- dox:child v1 -->
# `frontend/src/components/credit-report/` — Credit report UI

Components for the Credit Report page.

## What lives here

Read-only server-driven table, toolbar, pagination, and detail dialog for the SAP Credit Management report. State lives in `hooks/useCreditReportList.ts`.

## Local conventions

- No mutations — credit report is read-only.
- Money cells use INR formatting and sign coloring (red negative, green positive).

## Key files

| File | Role |
|------|------|
| `CreditReportTable.tsx` | Sortable server-driven table. |
| `CreditReportTableToolbar.tsx` | Date picker + filters. |
| `CreditReportFilters.tsx` | Inline async filters + blocked/balance selects. |
| `CreditReportTablePagination.tsx` | Page/limit controls. |
| `ViewCreditReportDialog.tsx` | Read-only detail dialog. |
| `credit-report-fields.ts` | Config-driven field registry. |
| `hooks/useCreditReportList.ts` | All Credit Report page state. |

## Gotchas / fragile spots

- Filter surface: single date + 4 async selects + blocked + credit balance.

## Up / down

- Parent: [`../CLAUDE.md`](../CLAUDE.md)
- Children: [`hooks/`](hooks/CLAUDE.md)
- Related repo docs: [`../../../../frontend_docs/COMPONENTS.md`](../../../../frontend_docs/COMPONENTS.md)

<!-- dox:child v1 -->
# `frontend/src/api/credit-report/` — Credit report API

HTTP wrappers for the `/credit-report` endpoints.

## What lives here

Read-only browse and export for the daily SAP Credit Management report, filtered to the JV0H / VJ0H control areas at ingest.

## Local conventions

- No mutations — credit report is read-only for frontend users.
- Export uses raw `fetch` for binary `.xlsx` download.

## Key files

| File | Role |
|------|------|
| `list.ts` | `GET /credit-report` — paginated, filtered list. |
| `options.ts` | Per-field async option search. |
| `export.ts` | `GET /credit-report/export` — binary download. |

## Gotchas / fragile spots

- Blocked and credit-balance filters use fixed frontend enums mapped to backend values.

## Up / down

- Parent: [`../CLAUDE.md`](../CLAUDE.md)
- Children: none
- Related repo docs: [`../../../../frontend_docs/API_LAYER.md`](../../../../frontend_docs/API_LAYER.md)

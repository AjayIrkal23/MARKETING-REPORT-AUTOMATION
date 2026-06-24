<!-- dox:child v1 -->
# `backend/app/services/dashboard/` — Dashboard summary

Today's per-report ingestion status for the dashboard landing page.

## What lives here

A single service that builds the dashboard cards for JSW Stock, JVML Stock, and
Credit Report by reading each domain's ingestion and config collections.

## Local conventions

- Derive `extracted` / `missing` booleans server-side so the frontend renders
  state without re-implementing business rules.
- Use `asyncio.gather` to fetch ingestion + config rows concurrently.
- Match the poller's local-date convention (`dd-mm-yyyy`).
- Credit Report includes active-region zone statuses; `partial` is treated as
  needing attention, not as fully extracted.

## Key files

| File | Role |
|------|------|
| `__init__.py` | Empty package marker. |
| `summary.py` | `get_dashboard_summary()` — today's status across all three reports. |

## Gotchas / fragile spots

- `_today_local()` uses the server's local clock; it must match the date-folder
  convention used by the ingestion pollers.
- Missing ingestion/config documents degrade gracefully (`status="none"`,
  `enabled=False`).

## Up / down

- Parent: [`../CLAUDE.md`](../CLAUDE.md)
- Children: none
- Related repo docs: [`backend_docs/API_CONTRACT.md`](../../../backend_docs/API_CONTRACT.md)

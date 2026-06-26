<!-- dox:child v1 -->
# `backend/app/services/cron/` — Scheduled cron jobs

APScheduler job wrappers and the audit-heartbeat job.

## What lives here

`audited_job` is a decorator that auto-emits a `cron` audit entry for every run.
Domain poll jobs wrap the stock/credit ingestion pollers so the scheduler can
invoke them without import cycles.

## Local conventions

- Wrap every new cron job with `@audited_job("cron.<name>")`.
- Use local imports inside poll jobs to avoid scheduler → cron → service cycles.
- Re-raise exceptions after auditing so APScheduler records the misfire.

## Key files

| File | Role |
|------|------|
| `__init__.py` | Imports `heartbeat` first, then domain poll jobs; aggregates exports. |
| `heartbeat.py` | `audited_job` decorator and `heartbeat_job` liveness probe. |
| `jsw_stock.py` | JSW Stock poll job wrapper. |
| `jvml_stock.py` | JVML Stock poll job wrapper. |
| `credit_report.py` | Credit Report poll job wrapper. |
| `cleanup.py` | `cleanup_old_folders_job` (`cron.cleanup`) — daily stale-folder purge; defers to `services/cleanup/runner.py`. |

## Gotchas / fragile spots

- `__init__.py` import order matters: `heartbeat` must be imported first because
  it defines `audited_job`, which the domain modules import.
- Poll wrappers are intentionally thin; heavy ingestion logic lives in the
  respective domain service packages (`services/jsw_stock/poller.py`, etc.).

## Up / down

- Parent: [`../CLAUDE.md`](../CLAUDE.md)
- Children: none
- Related repo docs: [`backend_docs/ARCHITECTURE.md`](../../../backend_docs/ARCHITECTURE.md)

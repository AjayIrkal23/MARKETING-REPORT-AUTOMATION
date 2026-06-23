<!-- dox:child v1 -->
# `backend/app/services/meta/` — Meta-domain services

Banner, health, and ping data for the service meta endpoints.

## What lives here

Pure, stateless helpers used by `controllers/meta.py`. No database access.

## Local conventions

- Keep functions side-effect free and fast.
- Uptime is computed from `time.monotonic()`.

## Key files

| File | Role |
|------|------|
| `__init__.py` | Empty package marker. |
| `ping.py` | `get_root()`, `get_health()`, `next_ping()` and in-process ping counter. |

## Gotchas / fragile spots

- The ping counter is in-process only and resets on server restart.
- `__version__` is imported from `app`.

## Up / down

- Parent: [`../CLAUDE.md`](../CLAUDE.md)
- Children: none
- Related repo docs: [`backend/CLAUDE.md`](../../../CLAUDE.md)

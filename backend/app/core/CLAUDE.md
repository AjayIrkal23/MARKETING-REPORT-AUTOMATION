<!-- dox:child v1 -->
# `backend/app/core/` — Cross-cutting concerns

Configuration, database lifecycle, security, sessions, scheduling, email, OTP,
response envelopes, and centralized exception handling.

## What lives here

Pure infrastructure modules used by every layer. Nothing here knows about HTTP
routes or domain business rules; `core/` provides the primitives those layers
consume.

## Local conventions

- `config.py::get_settings()` is the single cached source of truth for env vars.
- New Beanie document models must be added to `database.py::DOCUMENT_MODELS`.
- Services raise typed `AppError` subclasses; `exception_handlers.py` maps them
  to HTTP responses.
- Email/OTP failures are logged, never re-raised, so a mail problem cannot abort
  a user request.
- Scheduler startup failures are non-fatal so the app can still boot.

## Key files

| File | Role |
|------|------|
| `__init__.py` | Package docstring only. |
| `config.py` | `Settings` (Pydantic) — env / `.env` values; `get_settings()`. |
| `database.py` | MongoDB client init/close via Beanie; `DOCUMENT_MODELS` registry. |
| `security.py` | bcrypt password hashing/verification. |
| `sessions.py` | HS256 session JWT signing/verification. |
| `auth_deps.py` | `get_current_user` / `get_current_admin` FastAPI dependencies. |
| `ratelimit.py` | In-process sliding-window login rate limiter. |
| `scheduler.py` | APScheduler lifecycle and stock/credit job registration. |
| `scheduler_stock.py` | Helpers to add/remove interval + deadline stock jobs. |
| `email.py` | Async SMTP send with dev-log fallback; invite/OTP renderers. |
| `otp.py` | CSPRNG OTP generation and bcrypt OTP hashing/verification. |
| `errors.py` | `AppError` taxonomy (`ValidationError`, `UnauthorizedError`, …). |
| `responses.py` | `SuccessEnvelope`, `ErrorEnvelope`, `PaginationMeta`, `success()`. |
| `exception_handlers.py` | Centralized handlers wired in `app.main`. |

## Gotchas / fragile spots

- Beanie 2.x uses `pymongo.AsyncMongoClient` (not Motor); `tz_aware=True` is
  required so stored UTC datetimes compare correctly after read-back.
- `session_secret` and `seed_admin_password` have no insecure defaults; login
  and seeding are skipped when they are empty.
- `scheduler.py` uses local imports to break the scheduler → cron → service
  import cycle — preserve them.
- `scheduler_stock.py` uses the server's local timezone for the deadline cron,
  matching the poller's naive local clock.

## Up / down

- Parent: [`../CLAUDE.md`](../CLAUDE.md)
- Children: none
- Related repo docs: [`backend_docs/ARCHITECTURE.md`](../../backend_docs/ARCHITECTURE.md) · [`backend_docs/ERROR_HANDLING.md`](../../backend_docs/ERROR_HANDLING.md)

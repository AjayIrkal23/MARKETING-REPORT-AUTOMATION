<!-- dox:child v1 -->
# `backend/app/` — FastAPI application code

All Python application code for the FastAPI service. Entry point is `main.py`;
code is organized in a layered architecture: `routes → controllers → services →
schemas/models`, with `core/` for cross-cutting concerns.

## What lives here

| Layer | Dir | Responsibility |
|-------|-----|----------------|
| Entry | `.` | `main.py` creates the FastAPI app, wires CORS, middleware, lifespan, routers |
| Routing | `routes/` | `APIRouter` registration per domain; aggregated in `routes/__init__.py` |
| Control | `controllers/` | Thin adapters: validate input → call service → return envelope |
| Business | `services/` | Business logic, DB access, audits, cron jobs |
| Data | `models/` | Beanie Document classes (MongoDB collections) |
| Contracts | `schemas/` | Pydantic v2 DTOs for request/response validation |
| Cross-cutting | `core/` | Config, DB, security, sessions, scheduler, email, errors, responses |
| HTTP capture | `middleware/` | `AuditMiddleware` records every request/response |
| Utilities | `utils/` | Query builders and helpers used by services |
| Scripts | `scripts/` | Standalone admin/utility scripts (seed, test email) |

## Local conventions

- One domain = one file per layer (`routes/<domain>.py`, `controllers/<domain>.py`,
  `services/<domain>/...`, `schemas/<domain>.py`).
- Every JSON endpoint returns the standard envelope (`success/data/message/meta`).
- Services raise typed `AppError` subclasses; never leak raw exceptions.
- List endpoints are backend-driven: pagination, sort whitelist, unknown-key rejection.
- New Beanie documents must be added to `core/database.py::DOCUMENT_MODELS`.
- New audit categories need matching entries in `models/audit_log.py`,
  `schemas/audit_log.py`, `services/audit_log/options.py::_CATEGORIES`, and
  `middleware/audit.py` path-to-category mapping.
- No file > 250 lines — split before adding behavior.

## Key files

| File | Role |
|------|------|
| `main.py` | FastAPI factory, lifespan, router include, middleware stack |
| `core/database.py` | MongoDB init via Beanie; `DOCUMENT_MODELS` registry |
| `core/config.py` | Pydantic `Settings` from env / `.env` |
| `core/security.py` | bcrypt password hashing/verification |
| `core/responses.py` | `SuccessEnvelope`, `ErrorEnvelope`, `success()` helper |
| `core/errors.py` | `AppError` taxonomy |
| `middleware/audit.py` | ASGI middleware that writes `audit_logs` |
| `routes/__init__.py` | Aggregates all domain routers under `/api` prefixes |

## Gotchas / fragile spots

- `services/cron/__init__.py` must import `heartbeat` **first** to avoid partially-initialized
  module errors; then import domain cron jobs.
- `core/scheduler.py` uses local imports for scheduler↔cron↔service wiring to break a
  circular import chain — preserve those `# noqa: PLC0415` local imports.
- `jsw_stock` / `jvml_stock` / `credit_report` parsers are raw-zip readers, **not**
  `openpyxl` — the source files contain malformed numeric cells that crash openpyxl.

## Up / down

- Parent: [`../CLAUDE.md`](../CLAUDE.md)
- Children: [`controllers/`](controllers/CLAUDE.md) · [`core/`](core/CLAUDE.md) · [`middleware/`](middleware/CLAUDE.md) · [`models/`](models/CLAUDE.md) · [`routes/`](routes/CLAUDE.md) · [`schemas/`](schemas/CLAUDE.md) · [`scripts/`](scripts/CLAUDE.md) · [`services/`](services/CLAUDE.md) · [`utils/`](utils/CLAUDE.md)
- Related repo docs: [`backend_docs/README.md`](../../backend_docs/README.md)

<!-- dox:child v1 -->
# `backend/app/services/` — Domain business logic

Business logic, DB access, cron jobs, and audit event emission. Each subdomain
is a package of focused service modules.

## What lives here

Services are transport-free: they receive validated DTOs, perform DB work and
business rules, raise typed `AppError` subclasses, and emit audit events. HTTP
concerns (cookies, headers, envelopes) live in controllers.

## Local conventions

- One domain = one subdirectory (e.g. `region/`, `audit_log/`).
- One action per file inside a domain package (`create.py`, `list.py`, …).
- Use the matching `utils/<domain>/query.py` builder for filtering/sorting.
- Emit audit events via `services.audit.events` helpers; audit failures must not
  abort the primary operation.
- Wrap cron jobs with `@audited_job` from `services.cron`.

## Key files

| File | Role |
|------|------|
| `__init__.py` | Package docstring only. |
| `admin_user/` | Admin user CRUD, enable/disable, reset password, list/options. |
| `audit/` | Audit write primitives (`record_audit`, `spawn_audit`), redaction, event helpers. |
| `audit_log/` | Audit-log read API: list, get, options, facets, serialization. |
| `auth/` | Login, account status, OTP request/confirm. |
| `coil_price/` | Coil price CRUD and list/serialization. |
| `cron/` | `@audited_job` decorator, heartbeat, stock/credit poll wrappers. |
| `customer_code/` | Customer code CRUD, import, export, template. |
| `credit_report/` | Credit report ingestion, list, export, config. |
| `dashboard/` | Today's ingestion status summary. |
| `jsw_stock/` / `jvml_stock/` | Stock ingestion, list, export, config, status. |
| `meta/` | Root/health/ping data. |
| `region/` | Region CRUD and list/options. |
| `report/` | RAKE pivot report generation and export. |
| `shared/` | Cross-domain ingestion helpers (duplicate cleanup). |
| `user/` | User list and idempotent admin seed. |

## Gotchas / fragile spots

- `services/cron/__init__.py` must import `heartbeat` **first** to avoid
  partially-initialized modules.
- Cron job wrappers use local imports for pollers to avoid scheduler → cron →
  service cycles.
- Any new domain that needs auditing needs a matching category in
  `models/audit_log.py`, `schemas/audit_log.py`, `middleware/audit.py`, and
  `services/audit/events.py`.

## Up / down

- Parent: [`../CLAUDE.md`](../CLAUDE.md)
- Children: [`admin_user/`](admin_user/CLAUDE.md) · [`audit/`](audit/CLAUDE.md) · [`audit_log/`](audit_log/CLAUDE.md) · [`auth/`](auth/CLAUDE.md) · [`coil_price/`](coil_price/CLAUDE.md) · [`cron/`](cron/CLAUDE.md) · [`customer_code/`](customer_code/CLAUDE.md) · [`credit_report/`](credit_report/CLAUDE.md) · [`dashboard/`](dashboard/CLAUDE.md) · [`jsw_stock/`](jsw_stock/CLAUDE.md) · [`jvml_stock/`](jvml_stock/CLAUDE.md) · [`meta/`](meta/CLAUDE.md) · [`region/`](region/CLAUDE.md) · [`report/`](report/CLAUDE.md) · [`shared/`](shared/CLAUDE.md) · [`user/`](user/CLAUDE.md)
- Related repo docs: [`backend_docs/SERVICES.md`](../../backend_docs/SERVICES.md)

<!-- dox:child v1 -->
# `backend/app/services/audit/` — Audit write infrastructure

Primitives for persisting audit events and redacting sensitive payloads.

## What lives here

Low-level audit write helpers plus semantic wrappers for system, cron,
security, auth, user, region, coil-config, customer-code, stock, and credit-report
events. The middleware calls `spawn_audit` for every HTTP request; non-HTTP code
paths call the awaitable event helpers.

## Local conventions

- `record_audit` never raises — audit failures are logged and swallowed.
- `spawn_audit` is fire-and-forget and must not block responses.
- Redact payloads before storage via `redact.py`.
- Import `AuditLog` locally inside `record_audit` to avoid startup cycles.

## Key files

| File | Role |
|------|------|
| `__init__.py` | Aggregates public exports (`record_audit`, `spawn_audit`, event helpers). |
| `record.py` | `record_audit()` and `spawn_audit()` primitives. |
| `redact.py` | Secret/key redaction and safe body extraction. |
| `events.py` | Semantic helpers (`audit_auth_event`, `audit_cron_event`, …). |

## Gotchas / fragile spots

- `_pending` in `record.py` holds strong references to in-flight audit tasks so
  the event loop cannot garbage-collect them.
- A bare `code` key is intentionally **not** redacted so API error codes remain
  readable in audit payloads.
- Adding a new audit category requires matching entries in `models/audit_log.py`,
  `schemas/audit_log.py`, `services/audit_log/options.py`, and `middleware/audit.py`.

## Up / down

- Parent: [`../CLAUDE.md`](../CLAUDE.md)
- Children: none
- Related repo docs: [`backend_docs/ARCHITECTURE.md`](../../../backend_docs/ARCHITECTURE.md)

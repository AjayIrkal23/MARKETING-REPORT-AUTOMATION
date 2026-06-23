<!-- dox:child v1 -->
# `backend/app/middleware/` — ASGI middleware

HTTP middleware components. Currently holds the audit middleware that records
every request/response automatically.

## What lives here

`AuditMiddleware` is a pure-ASGI middleware (not `BaseHTTPMiddleware`) that wraps
the app, captures request/response metadata, redacts secrets, and writes an
`audit_logs` document without blocking the response.

## Local conventions

- Keep middleware transport-only; no domain business logic.
- `AuditMiddleware` is registered as the outermost layer in `app.main` so it sees
  final statuses, CORS headers, and error envelopes.
- Skip paths are driven by `Settings.audit_skip_paths` and
  `Settings.audit_skip_path_prefixes`.

## Key files

| File | Role |
|------|------|
| `__init__.py` | Re-exports `AuditMiddleware`. |
| `audit.py` | `AuditMiddleware` — request/response capture, category mapping, redaction. |

## Gotchas / fragile spots

- `_CATEGORY_PREFIXES` is evaluated in order; specific domain prefixes must come
  before the generic `/admin` fallback. Add a new domain's prefix here when you
  add routes.
- Body capture is capped by `audit_max_body_bytes`; large payloads are stored as
  size markers only.
- `spawn_audit` is fire-and-forget; audit write failures are logged, never raised.

## Up / down

- Parent: [`../CLAUDE.md`](../CLAUDE.md)
- Children: none
- Related repo docs: [`backend_docs/ARCHITECTURE.md`](../../backend_docs/ARCHITECTURE.md)

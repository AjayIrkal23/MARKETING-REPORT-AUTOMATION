# Backend Error Handling

Centralized error taxonomy and exception handling for the JSW Marketing Report Automation backend.
Governed by the `backend-error-handling` skill; combined with `api-contract-standards` for envelope shape
and `service-layer-standards` for where errors originate.

---

## AppError Taxonomy

All expected domain errors live in `backend/app/core/errors.py`.
Every subclass carries a fixed `status_code` and `code`; services raise only these types.

| Class | `status_code` | `code` | Use case |
|---|---|---|---|
| `AppError` | 500 | `INTERNAL_ERROR` | Base class; do not raise directly |
| `ValidationError` | 400 | `VALIDATION_ERROR` | Domain-level input rejection (beyond Pydantic) |
| `UnauthorizedError` | 401 | `UNAUTHORIZED` | Bad/missing credentials |
| `ForbiddenError` | 403 | `FORBIDDEN` | Authenticated but not allowed |
| `NotFoundError` | 404 | `NOT_FOUND` | Resource absent |
| `ConflictError` | 409 | `CONFLICT` | Duplicate / state conflict |

Constructor signature (same for all subclasses):

```python
class AppError(Exception):
    status_code: int = 500
    code: str = "INTERNAL_ERROR"

    def __init__(self, message: str = "Something went wrong", details: Any | None = None) -> None:
        ...
```

- `message` — safe, client-visible string.
- `details` — optional narrow context (field names, rejected values); omit if it leaks internals.

---

## Raising in Services

**Rule:** Services raise typed `AppError` subclasses only. Raw `Exception`, `ValueError`, or
driver errors must never propagate to routes. Services are transport-free — no
`JSONResponse`, no `HTTPException`.

Pattern from `app/services/auth/login.py`:

```python
from ...core.errors import UnauthorizedError

user = await User.find_one(User.emailid == payload.emailid)
if user is None or not verify_password(payload.password, user.password):
    raise UnauthorizedError("Invalid email or password")
```

Rules:

- Import the most specific subclass (`NotFoundError`, `ConflictError`, etc.).
- Pass a client-safe `message`; put debug context in `details` only if it adds value without leaking.
- Never swallow failures silently (`except Exception: pass` is forbidden).
- Never raise a generic `Exception`; add a new `AppError` subclass if no existing one fits.

---

## Centralized Handlers

Registered in `app/core/exception_handlers.py` via `register_exception_handlers(app)`,
called from the `create_app()` factory in `app/main.py`.

### Handler map

| Exception type | Handler | HTTP status | `code` |
|---|---|---|---|
| `AppError` (and subclasses) | `_handle_app_error` | `exc.status_code` | `exc.code` |
| `RequestValidationError` (Pydantic/FastAPI) | `_handle_validation_error` | 400 | `VALIDATION_ERROR` |
| `StarletteHTTPException` | `_handle_http_exception` | `exc.status_code` | `HTTP_ERROR` |
| `Exception` (catch-all) | `_handle_unexpected` | 500 | `INTERNAL_ERROR` |

### Behavior rules

- Stack traces and driver errors are **never** forwarded to the client.
- `_handle_unexpected` calls `logger.exception(...)` server-side before returning the generic 500.
- Controllers must **not** build ad-hoc error payloads; raise a typed error and let the handler normalize it.

### Error envelope shape

Every error response is an `ErrorEnvelope` (`app/core/responses.py`):

```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid email or password",
    "details": null
  }
}
```

Fields:

| Field | Type | Required | Notes |
|---|---|---|---|
| `success` | `false` | yes | Always literal `false` |
| `error.code` | `str` | yes | Snake-UPPER constant, matches the `AppError` subclass |
| `error.message` | `str` | yes | Client-safe; never include stack traces or SQL |
| `error.details` | `Any \| null` | no | Narrow extra context; omit if it exposes internals |

---

## Auth Errors — No User Enumeration

`POST /auth/login` (`app/services/auth/login.py`) collapses "unknown email" and "wrong password"
into a **single generic response** to prevent user enumeration (`owasp-security`):

```python
if user is None or not verify_password(payload.password, user.password):
    raise UnauthorizedError("Invalid email or password")
```

- Both branches raise the same `UnauthorizedError` with the same message.
- The client receives `401 UNAUTHORIZED` with `"Invalid email or password"` regardless of which branch fired.
- Do not add conditional messages, logging differences, or timing branches that distinguish the two cases.

---

## Logging Rules

- Log the full exception server-side (`logger.exception(...)`) for unexpected errors.
- Do not log raw passwords, tokens, or request bodies containing credentials.
- The `details` field in the error envelope must be reviewed before inclusion — reject anything
  that echoes back a bcrypt hash, internal path, or driver error string.

---

## Adding a New Error Type

1. Add a subclass to `app/core/errors.py` (file must stay ≤250 lines).
2. Set unique `status_code` and `code` class attributes.
3. Raise it in the relevant service — no handler changes needed; `_handle_app_error` covers all `AppError` subclasses.
4. Document the new code in this file and the affected endpoint's schema doc.

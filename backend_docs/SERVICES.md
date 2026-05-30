# Backend Service Layer

Reference for the service-layer boundary rules, controller discipline, and
helper conventions in the JSW Marketing Report Automation backend.
Governing skills: **`service-layer-standards`**, **`backend-standards-always-follow`**.

---

## Boundary Rules

The layer stack is: `route → controller → service → (model / core) → envelope`.
Each layer has one job and must not reach into its neighbours' responsibilities.

| Layer | Owns | Must NOT |
|---|---|---|
| **Service** | Business logic, all DB access, filtering, sorting, pagination, typed error raises | Import `Request`, `Response`, or any FastAPI/Starlette transport object; set headers or cookies; return raw DB documents with private fields |
| **Controller** | Read validated params/body, call one service, wrap result in `success()` | Run DB queries, implement business rules, build complex filters, transform domain data |
| **Route** | Register the `APIRouter` path, declare the response model, inject dependencies | Contain any logic beyond delegating to the controller |

### AppError taxonomy (`core/errors.py`)

Services raise typed subclasses — never raw `Exception`. The centralized handler
in `core/exception_handlers.py` maps them to the standard error envelope; no
stack trace ever reaches the client.

| Class | HTTP | `code` |
|---|---|---|
| `ValidationError` | 400 | `VALIDATION_ERROR` |
| `UnauthorizedError` | 401 | `UNAUTHORIZED` |
| `ForbiddenError` | 403 | `FORBIDDEN` |
| `NotFoundError` | 404 | `NOT_FOUND` |
| `ConflictError` | 409 | `CONFLICT` |
| `AppError` (base) | 500 | `INTERNAL_ERROR` |

### Response envelope (`core/responses.py`)

```python
# success
SuccessEnvelope: {success: true, data: T, message: str, meta: dict | None}

# error (built by exception_handlers, never by services)
ErrorEnvelope:   {success: false, error: {code, message, details}}
```

`PaginationMeta` fields: `page`, `limit`, `total`, `totalPages`, `sortBy`, `sortOrder`.
Controllers call `success(data, message="...", meta=...)` — never construct envelopes by hand.

---

## Thin Controllers

A controller body is **three lines**: receive validated input, call service, return envelope.
No branching, no DB calls, no data transformation.

```python
# controllers/auth.py
async def login_controller(payload: LoginRequest) -> SuccessEnvelope[AuthUser]:
    user = await login_service(payload)
    return success(user, message="Login successful")

# controllers/user.py
async def list_users_controller(
    query: UserListQuery = Depends(),
) -> SuccessEnvelope[list[UserPublic]]:
    items, meta = await list_users(query)
    return success(items, meta=meta)

# controllers/meta.py
async def ping_controller() -> SuccessEnvelope[PingData]:
    return success(meta_service.next_ping(), message="pong")
```

**Input is already validated** by Pydantic before the controller is called — no
ad-hoc re-validation inside controllers.

---

## Service Layout

Pattern: `services/<domain>/<action>.py`. Each file is one focused action;
shared helpers go into a `utils/<domain>/` sibling.

```
app/
  services/
    meta/
      ping.py          # get_root(), get_health(), next_ping() — no DB, pure computation
    auth/
      login.py         # login(payload) -> AuthUser — bcrypt verify, stamp lastlogined
    user/
      list.py          # list_users(query) -> (list[UserPublic], meta dict)
      seed.py          # ensure_admin_user() — idempotent seed, called on startup
  utils/
    user/
      query.py         # build_user_filter(), build_sort() — filter + Beanie sort tokens
```

### auth/login.py — key rules encoded

- Single generic `401` for unknown email **and** bad password (no user enumeration — `owasp-security`).
- Stamps `user.lastlogined` and saves via Beanie before returning.
- Returns `AuthUser` DTO (no password field) — never the raw `User` document.

```python
async def login(payload: LoginRequest) -> AuthUser:
    user = await User.find_one(User.emailid == payload.emailid)
    if user is None or not verify_password(payload.password, user.password):
        raise UnauthorizedError("Invalid email or password")
    user.lastlogined = datetime.now(timezone.utc)
    await user.save()
    return AuthUser(emailid=user.emailid, isAdmin=user.isAdmin, lastlogined=user.lastlogined)
```

### user/list.py — key rules encoded

- All filtering, sorting, and pagination run at the DB layer (not in Python).
- Returns `(list[UserPublic], meta_dict)` — controller decides envelope shape.
- `UserPublic` strips the password hash; raw `User` docs never leave this file.

### user/seed.py

- Called from `app/main.py` lifespan (startup) and `python -m app.scripts.seed`.
- Idempotent — keyed on unique `emailid`; safe to re-run.

---

## Helpers (`utils/<domain>/query.py`)

Query builders belong in `utils/`, not in services. They are pure functions
(no DB calls, no side effects) that translate validated schema objects into
driver-level arguments.

```python
# utils/user/query.py

def build_user_filter(query: UserListQuery) -> dict:
    """MongoDB filter document from validated query params."""
    filt: dict = {}
    if query.q:
        filt["emailid"] = {"$regex": query.q, "$options": "i"}
    return filt

def build_sort(sort_by: str, sort_order: str) -> str:
    """Beanie sort token (+field / -field) from whitelisted input."""
    return f"{'+' if sort_order == 'asc' else '-'}{sort_by}"
```

Sort keys are whitelisted in the schema (`UserSortBy = Literal["emailid","lastlogined","isAdmin"]`);
unknown keys are rejected by Pydantic before reaching the service.
`PageQuery.limit` is capped at `le=100`; `page` is `ge=1`.

---

## File-Size Rule

No service, controller, route, schema, or helper may exceed **250 lines**.
When a service grows, split along these seams before adding behavior:

- Filter/sort building → `utils/<domain>/query.py`
- Field mapping / projection → `utils/<domain>/mappers.py`
- Business-rule guards → `services/<domain>/constraints.py`
- External integrations → a dedicated service wrapper

---

## Adding a New Domain

Mirror the existing structure exactly:

```
routes/<domain>.py        — APIRouter, response_model annotation
controllers/<domain>.py   — thin: Depends() + service call + success()
services/<domain>/<action>.py — logic + DB, raise AppError subclass
schemas/<domain>.py       — Pydantic I/O DTOs (extend PageQuery for lists)
utils/<domain>/query.py   — filter/sort helpers if the domain has a list endpoint
```

Register the new router in `routes/__init__.py` (`api_router.include_router(...)`).
Apply all 27 backend craft skills (`~/.claude/rules/agent-lifecycle-routing.md`).

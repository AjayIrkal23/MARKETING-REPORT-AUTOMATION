# Backend Project Reference & Linkage

Navigation and linkage map for AI agents and developers before editing backend code.
Governs: **project-reference-linkage** + **project-structure-map** skills.

---

## Stack at a Glance

| Component | Version | Notes |
|---|---|---|
| Python | 3.13.7 | Venv at `backend/.venv` — never system Python |
| FastAPI | 0.136.3 | App factory in `app/main.py` |
| Pydantic | 2.13.4 | v2 — all models are `BaseModel`, not v1 compat |
| Uvicorn | 0.48.0 | standard extras (uvloop, httptools, websockets) |
| MongoDB ODM | Beanie 2.1.0 + pymongo `AsyncMongoClient` | Motor is RETIRED — never add it |
| Password hashing | bcrypt 5.0.0 | `core/security.py` — no plaintext ever |
| Email validation | email-validator 2.3.0 | `EmailStr` on all email fields |

---

## Mandatory Directory Map

```
backend/app/
  __init__.py               # __version__ string
  main.py                   # create_app() — CORS, lifespan, exception handlers, router
  core/
    config.py               # Settings (env vars + .env via dotenv); get_settings() cached
    database.py             # init_db() / close_db() — AsyncMongoClient + Beanie init
    security.py             # hash_password() / verify_password() (bcrypt)
    errors.py               # AppError taxonomy (see table below)
    responses.py            # SuccessEnvelope / ErrorEnvelope / PaginationMeta / success()
    exception_handlers.py   # register_exception_handlers() — maps AppError → HTTP envelope
  models/
    __init__.py             # re-exports User
    user.py                 # User(Document) — collection "users"
  schemas/
    common.py               # PageQuery base (page, limit, sortOrder, skip property)
    meta.py                 # RootData / HealthData / PingData
    auth.py                 # LoginRequest / AuthUser
    user.py                 # UserListQuery (extends PageQuery) / UserPublic / UserSortBy
  services/
    meta/ping.py            # ping counter logic (in-process, resets on restart)
    auth/login.py           # credential verify + lastlogined stamp → AuthUser
    user/list.py            # backend-driven paginated user list → (UserPublic[], meta dict)
    user/seed.py            # idempotent admin creation (called in lifespan + scripts/seed.py)
  controllers/
    __init__.py             # (empty — no aggregator; imported by name in routes)
    meta.py                 # root_controller / health_controller / ping_controller
    auth.py                 # login_controller
    user.py                 # list_users_controller
  routes/
    __init__.py             # api_router — aggregates meta + auth + user routers
    meta.py                 # GET / /health /ping, WS /ws/ping (no prefix)
    auth.py                 # prefix /auth → POST /auth/login
    user.py                 # prefix /users → GET /users
  utils/
    user/query.py           # build_user_filter() / build_sort() (used only by services/user/list.py)
  scripts/
    seed.py                 # `python -m app.scripts.seed` (standalone seed runner)
```

Every file is ≤250 lines. Split before extending.

---

## Endpoint Reference

| Method | Path | Request | `data` in envelope | Notes |
|---|---|---|---|---|
| GET | `/` | — | `RootData` | Service banner |
| GET | `/health` | — | `HealthData` | uptime_seconds (float) |
| GET | `/ping` | — | `PingData` | seq auto-increments; resets on restart |
| WS | `/ws/ping` | text frame | text frame | "ping" → "pong"; else "echo:\<text\>" |
| POST | `/auth/login` | `{emailid, password}` | `AuthUser` | bcrypt verify; stamps lastlogined; generic 401 (no enumeration) |
| GET | `/users` | query params (see below) | `UserPublic[]` + pagination meta | |

`GET /users` query params: `page` (default 1), `limit` (default 20, max 100), `sortBy` (`emailid`\|`lastlogined`\|`isAdmin`, default `emailid`), `sortOrder` (`asc`\|`desc`, default `asc`), `q` (case-insensitive email regex, optional). Unknown `sortBy` values are rejected by Pydantic `Literal`.

---

## Envelope Shapes

**Success:**
```json
{"success": true, "data": <T>, "message": "", "meta": null}
```
List `meta` field (pagination):
```json
{"page": 1, "limit": 20, "total": 42, "totalPages": 3, "sortBy": "emailid", "sortOrder": "asc"}
```

**Error:**
```json
{"success": false, "error": {"code": "<CODE>", "message": "...", "details": null}}
```

`responses.py::success()` builds success envelopes. Never construct raw dicts in controllers.

---

## AppError Taxonomy (`core/errors.py`)

| Class | HTTP | `code` |
|---|---|---|
| `AppError` | 500 | `INTERNAL_ERROR` |
| `ValidationError` | 400 | `VALIDATION_ERROR` |
| `UnauthorizedError` | 401 | `UNAUTHORIZED` |
| `ForbiddenError` | 403 | `FORBIDDEN` |
| `NotFoundError` | 404 | `NOT_FOUND` |
| `ConflictError` | 409 | `CONFLICT` |

Services raise these; never raise raw `Exception` — the centralized handlers catch and envelope them. Stack traces never reach clients.

---

## User Model (`models/user.py`, collection `users`)

| Field | Type | Constraint |
|---|---|---|
| `emailid` | `EmailStr` | Unique index — natural login key |
| `password` | `str` | bcrypt hash ONLY — never plaintext |
| `lastlogined` | `datetime \| None` | UTC; stamped on each successful login |
| `isAdmin` | `bool` | Default `False` |

Beanie creates the unique `emailid` index on `init_beanie()`. No migration tooling — schemaless.

---

## Linkage Table

| Changed file | Also touch |
|---|---|
| `schemas/auth.py` (`LoginRequest`/`AuthUser`) | `controllers/auth.py`, `services/auth/login.py`, `routes/auth.py` (response_model) |
| `schemas/user.py` (`UserListQuery`/`UserPublic`) | `controllers/user.py`, `services/user/list.py`, `utils/user/query.py`, `routes/user.py` |
| `schemas/common.py` (`PageQuery`) | All domain query schemas that extend it (`schemas/user.py`); services that call `.skip` |
| `models/user.py` (`User` fields) | `services/auth/login.py`, `services/user/list.py`, `services/user/seed.py`, `core/database.py` (DOCUMENT_MODELS) |
| `core/responses.py` (`SuccessEnvelope`/`success()`) | Every controller (`controllers/*.py`) and every route `response_model` |
| `core/errors.py` (new `AppError` subclass) | `core/exception_handlers.py` (if new HTTP mapping needed) |
| `core/database.py` (new model) | Add to `DOCUMENT_MODELS`; add import in `models/__init__.py` |
| `core/config.py` (`Settings` field) | Any service/main that calls `get_settings()`. Clear `lru_cache` in tests. |
| `utils/user/query.py` | `services/user/list.py` (only caller) |

---

## Auth Domain: Real Request Flow

```
POST /auth/login
  routes/auth.py         router.add_api_route("/login", auth_ctrl.login_controller)
    controllers/auth.py  login_controller(payload: LoginRequest)
      services/auth/login.py  login(payload)
        models/user.py   User.find_one(User.emailid == payload.emailid)
        core/security.py verify_password(payload.password, user.password)
        → raises UnauthorizedError on failure (generic message, no enumeration)
        → stamps user.lastlogined; user.save()
        → returns AuthUser(emailid, isAdmin, lastlogined)
      schemas/auth.py    AuthUser (DTO)
    core/responses.py    success(user, message="Login successful")
  → SuccessEnvelope[AuthUser]
```

Any `AppError` propagates to `exception_handlers.py` → `ErrorEnvelope` JSON response.

---

## Adding a New Domain

Mirror the existing pattern exactly:

1. `schemas/<domain>.py` — Pydantic request + response DTOs; extend `PageQuery` for lists.
2. `services/<domain>/<action>.py` — business logic, DB access, raises `AppError` subclasses.
3. `controllers/<domain>.py` — thin: `Depends()` schema → call service → `success()`.
4. `routes/<domain>.py` — `APIRouter(prefix="/<domain>")` with typed `response_model`.
5. `routes/__init__.py` — `api_router.include_router(<domain>.router)`.
6. `core/database.py` — add new `Document` model to `DOCUMENT_MODELS`.

---

## Verification Checklist

Before marking any backend change complete:

- [ ] Path matches `{layer}/{domain}/{file}.py` — no logic in routes, no DB access in controllers
- [ ] No file exceeds 250 lines — split before extending
- [ ] Services raise only typed `AppError` subclasses — never raw `Exception`
- [ ] New model added to `DOCUMENT_MODELS` in `core/database.py`
- [ ] `success()` from `core/responses.py` used in every controller — no raw dicts
- [ ] Sort key whitelist is a `Literal` on the query schema — unknown keys rejected
- [ ] Password fields use `core/security.py` — never stored plaintext
- [ ] CORS origins unchanged unless intentional (`core/config.py`)
- [ ] No field renames on `User`, `AuthUser`, `UserPublic`, or envelope keys — these are integration contracts
- [ ] `motor` not added to requirements — Beanie 2.x uses `pymongo.AsyncMongoClient`

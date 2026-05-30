# Backend Architecture

FastAPI service for the JSW Marketing Report Automation dashboard. Governed by
`backend-standards-always-follow` and `service-layer-standards`; every backend
change must honour both skills and the 27-skill mandatory set.

---

## Layers

Four strict layers plus a cross-cutting `core/`. Each layer has one job.

| Layer | Location | Responsibility |
|---|---|---|
| **Routes** | `app/routes/` | `APIRouter` per domain; URL mapping, HTTP method, dependency injection only. Aggregate via `routes/__init__.py::api_router`. |
| **Controllers** | `app/controllers/` | Thin orchestrators: receive validated input, call one service, return `success()` envelope. No DB queries, no business rules. |
| **Services** | `app/services/<domain>/<action>.py` | All business logic and DB access. Transport-free — never touch `Request`/`Response`. Raise typed `AppError` on rule violations. |
| **Schemas** | `app/schemas/` | Pydantic v2 I/O DTOs (request bodies, query params, response payloads). `UserListQuery` sort keys are whitelisted via `Literal`. |
| **Models** | `app/models/` | Beanie `Document` subclasses — MongoDB collection definitions. Strip private fields (e.g. `password`) before returning to clients via `UserPublic`. |
| **Core** | `app/core/` | Cross-cutting: config, DB lifecycle, security helpers, error taxonomy, response envelopes, centralized exception handlers. |

**Invariants enforced by skill:**
- Controllers stay thin (`service-layer-standards`).
- Every file stays at or below 250 lines (`backend-standards-always-follow`).
- No raw exceptions or stack traces reach clients (`backend-error-handling`).
- List endpoints are fully backend-driven — no client-side filtering (`backend-api-standards`).

---

## Request Flow

```
HTTP Request
    |
    v
app/routes/<domain>.py   (APIRouter — URL + method binding, Depends() for query schemas)
    |
    v
app/controllers/<domain>.py  (validate input already done by FastAPI/Pydantic)
    |                         call service, return success() envelope
    v
app/services/<domain>/<action>.py  (business logic, DB via Beanie/pymongo)
    |                               raise typed AppError on failures
    v
app/models/user.py  +  app/core/database.py  (MongoDB AsyncMongoClient + Beanie)
    |
    v
app/core/responses.py::success()  ->  SuccessEnvelope{success, data, message, meta}
    |
HTTP 200 JSON response

--- error path ---
AppError raised anywhere in service
    |
app/core/exception_handlers.py  (registered on app in create_app())
    |  _handle_app_error   -> AppError subclass -> correct HTTP status
    |  _handle_validation_error -> RequestValidationError (FastAPI) -> 400
    |  _handle_http_exception   -> StarletteHTTPException -> passthrough
    |  _handle_unexpected       -> any Exception -> 500 (server-side logged only)
    v
ErrorEnvelope{success: false, error: {code, message, details}}
```

---

## Response Envelopes (`app/core/responses.py`)

All JSON endpoints use these shapes. Keys must not be renamed.

**Success**
```json
{
  "success": true,
  "data": <payload>,
  "message": "",
  "meta": null
}
```

**Paginated success** — `meta` is a `PaginationMeta` dict:
```json
{
  "page": 1, "limit": 20, "total": 42, "totalPages": 3,
  "sortBy": "emailid", "sortOrder": "asc"
}
```

**Error**
```json
{
  "success": false,
  "error": { "code": "UNAUTHORIZED", "message": "...", "details": null }
}
```

---

## AppError Taxonomy (`app/core/errors.py`)

| Class | HTTP | `code` |
|---|---|---|
| `AppError` (base) | 500 | `INTERNAL_ERROR` |
| `ValidationError` | 400 | `VALIDATION_ERROR` |
| `UnauthorizedError` | 401 | `UNAUTHORIZED` |
| `ForbiddenError` | 403 | `FORBIDDEN` |
| `NotFoundError` | 404 | `NOT_FOUND` |
| `ConflictError` | 409 | `CONFLICT` |

Services raise these; handlers map them; clients never see raw exceptions.

---

## app/ Tree (annotated)

```
app/
  __init__.py               # __version__
  main.py                   # create_app() factory; lifespan hook
  core/
    config.py               # Settings (Pydantic model, lru_cache); reads MONGODB_URI, MONGODB_DB, SEED_ADMIN_*, cors_origins
    database.py             # init_db() / close_db() — pymongo AsyncMongoClient + Beanie init_beanie
    security.py             # hash_password() / verify_password() via bcrypt 5
    errors.py               # AppError + 5 typed subclasses
    responses.py            # SuccessEnvelope, ErrorEnvelope, PaginationMeta, success()
    exception_handlers.py   # register_exception_handlers(app): 4 handlers wired
  models/
    user.py                 # User(Document); collection "users"; emailid unique-indexed
  schemas/
    common.py               # PageQuery (page, limit, maxLimit=100)
    meta.py                 # RootData, HealthData, PingData
    auth.py                 # LoginRequest {emailid, password}; AuthUser {emailid, isAdmin, lastlogined}
    user.py                 # UserListQuery (PageQuery + sortBy Literal + q); UserPublic
  controllers/
    meta.py                 # root_controller, health_controller, ping_controller
    auth.py                 # login_controller
    user.py                 # list_users_controller
  routes/
    __init__.py             # api_router aggregator (includes meta, auth, user routers)
    meta.py                 # GET / /health /ping, WS /ws/ping
    auth.py                 # POST /auth/login
    user.py                 # GET /users
  services/
    meta/ping.py            # ping counter (in-process, resets on restart)
    auth/login.py           # verify password (bcrypt), stamp lastlogined, raise UnauthorizedError
    user/list.py            # paginated + filtered user query (backend-driven)
    user/seed.py            # idempotent admin creation; called from lifespan + scripts/seed.py
  utils/
    user/query.py           # filter doc builder + sort-token builder for list endpoint
  scripts/
    seed.py                 # standalone entrypoint: python -m app.scripts.seed
```

---

## create_app() Factory + Lifespan (`app/main.py`)

```python
def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title="Branch Wise Report Automation API", lifespan=lifespan, ...)
    app.add_middleware(CORSMiddleware,
        allow_origins=list(settings.cors_origins),   # 3 localhost origins
        allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
    register_exception_handlers(app)   # 4 centralized handlers
    app.include_router(api_router)     # all domain routers aggregated
    return app
```

**Lifespan hook** (startup / shutdown):
1. `init_db()` — opens `AsyncMongoClient`, calls `init_beanie(document_models=[User])`.
2. `seed_admin()` — upserts the admin user; idempotent on `emailid` unique index.
3. MongoDB failures are caught and logged as non-fatal so `/ping` and `/health` boot without a DB.
4. On shutdown: `close_db()` closes the client.

---

## Endpoints

| Method | Path | Controller | `data` type | Notes |
|---|---|---|---|---|
| GET | `/` | `root_controller` | `RootData` | Service banner |
| GET | `/health` | `health_controller` | `HealthData` | `status`, `version`, `uptime_seconds` |
| GET | `/ping` | `ping_controller` | `PingData` | `message="pong"`, `seq`, `timestamp` |
| WS | `/ws/ping` | inline route | text frame | `"pong"` or `"echo:<text>"` |
| POST | `/auth/login` | `login_controller` | `AuthUser` | Body `{emailid, password}`; bcrypt verify; 401 generic (no user enumeration) |
| GET | `/users` | `list_users_controller` | `UserPublic[]` | Query: `page`, `limit` (max 100), `sortBy` (`emailid`\|`lastlogined`\|`isAdmin`), `sortOrder`, `q`; unknown `sortBy` rejected |

---

## MongoDB / Beanie Notes

- Driver: `pymongo.AsyncMongoClient` (Beanie 2.x). **Motor is retired — never add it.**
- `init_beanie` registers models in `DOCUMENT_MODELS = [User]` (`core/database.py`). Add new models here.
- Connection config: `MONGODB_URI` (default `mongodb://localhost:27017`), `MONGODB_DB` (default `marketing_report`). Set via env or `.env` (gitignored).
- No migrations — schemaless MongoDB; Beanie creates the `emailid` unique index on `init_beanie`.
- `password` field stores only a bcrypt hash. The `UserPublic` DTO omits it entirely.

---

## Adding a New Domain

Mirror the existing pattern — one file per layer, every file under 250 lines:

```
routes/<domain>.py        # APIRouter, register in routes/__init__.py
controllers/<domain>.py   # thin: Depends() -> service -> success()
services/<domain>/<action>.py  # business logic + DB, raise typed AppError
schemas/<domain>.py       # request + response DTOs
models/<domain>.py        # Beanie Document; add to DOCUMENT_MODELS in core/database.py
```

Apply `scaffold-standards` and `domain-scaffold-patterns` before writing.

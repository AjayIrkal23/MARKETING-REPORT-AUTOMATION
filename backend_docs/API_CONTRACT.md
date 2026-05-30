# Backend API Contract

Governing skills: `api-contract-standards`, `backend-api-standards`.
Stack: Python 3.13, FastAPI 0.136, Pydantic v2, Beanie 2.1 (AsyncMongoClient — Motor is retired), bcrypt 5.

---

## Envelope

Every JSON endpoint returns one of two shapes. The WebSocket (`/ws/ping`) is exempt.

### Success

```json
{
  "success": true,
  "data": <payload>,
  "message": "",
  "meta": null
}
```

`meta` is `null` for single-object responses and a `PaginationMeta` object for list responses.

**Pydantic class** — `core/responses.py`: `SuccessEnvelope[T]`
**Builder** — `core/responses.py`: `success(data, message="", meta=None)`

### Error

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Safe user-facing message",
    "details": null
  }
}
```

**Pydantic class** — `core/responses.py`: `ErrorEnvelope` / `ErrorBody`
**Sources** — `core/errors.py` typed `AppError` subclasses → `core/exception_handlers.py` maps them to HTTP status + envelope.

### Error code taxonomy (`core/errors.py`)

| Class | `code` | HTTP |
|---|---|---|
| `ValidationError` | `VALIDATION_ERROR` | 400 |
| `UnauthorizedError` | `UNAUTHORIZED` | 401 |
| `ForbiddenError` | `FORBIDDEN` | 403 |
| `NotFoundError` | `NOT_FOUND` | 404 |
| `ConflictError` | `CONFLICT` | 409 |
| `AppError` (base) | `INTERNAL_ERROR` | 500 |

Services raise typed `AppError` subclasses only. Raw exceptions never reach the client.

---

## Endpoint Catalogue

All routes registered via `routes/__init__.py` → `api_router` aggregator.

| Method | Path | `data` type | Notes |
|---|---|---|---|
| GET | `/` | `RootData` | Service banner: `service`, `version`, `docs`, `ping` |
| GET | `/health` | `HealthData` | `status` (`"ok"`), `version`, `uptime_seconds` (float) |
| GET | `/ping` | `PingData` | `message="pong"`, `seq` (auto-increment int), `timestamp` (ISO-8601 UTC) |
| WS | `/ws/ping` | text frame | `"pong"` for `"ping"` input; `"echo:<text>"` otherwise. Not JSON-enveloped. |
| POST | `/auth/login` | `AuthUser` | Body: `{emailid, password}`. Verifies bcrypt hash, stamps `lastlogined`. Generic `401 UNAUTHORIZED` on failure — no user enumeration. |
| GET | `/users` | `UserPublic[]` | Backend-driven paginated list. Pagination metadata in `meta`. |

### Schema types (from `schemas/`)

**`RootData` / `HealthData` / `PingData`** — defined in `schemas/meta.py`.

**`AuthUser`** (login response, `schemas/auth.py`):
```
emailid: EmailStr
isAdmin: bool
lastlogined: datetime | None
```

**`UserPublic`** (list item, `schemas/user.py` — password hash excluded):
```
emailid: EmailStr
isAdmin: bool
lastlogined: datetime | None
```

**`LoginRequest`** (login body, `schemas/auth.py`):
```
emailid: EmailStr
password: str  (min_length=1)
```

---

## Pagination & Sort

Applies to all list endpoints (`GET /users`). Governed by `backend-api-standards`.

### `PageQuery` base (`schemas/common.py`)

| Field | Type | Default | Constraint |
|---|---|---|---|
| `page` | `int` | `1` | `ge=1` |
| `limit` | `int` | `20` | `ge=1`, `le=100` (maxLimit) |
| `sortOrder` | `"asc" \| "desc"` | `"desc"` | Pydantic `Literal` |

`skip` property: `(page - 1) * limit` — computed, not a query param.

### `UserListQuery` (`schemas/user.py`, extends `PageQuery`)

| Field | Whitelist | Default |
|---|---|---|
| `sortBy` | `"emailid" \| "lastlogined" \| "isAdmin"` | `"emailid"` |
| `sortOrder` | `"asc" \| "desc"` | `"asc"` |
| `q` | — | `None` (optional case-insensitive email search via `$regex`) |

Unknown `sortBy` values are rejected at the Pydantic validation boundary before the service is called. No silent acceptance of unknown query keys.

### `PaginationMeta` (`core/responses.py`)

Returned as `meta` on list responses:

```json
{
  "page": 1,
  "limit": 20,
  "total": 45,
  "totalPages": 3,
  "sortBy": "emailid",
  "sortOrder": "asc"
}
```

Fields: `page`, `limit`, `total`, `totalPages`, `sortBy`, `sortOrder`. Shape is stable across all domains.

### Query execution rules

- All filtering, sorting, and pagination run in the DB layer (`services/user/list.py` + `utils/user/query.py`). No in-memory filtering of large datasets.
- `build_user_filter(query)` → MongoDB filter document.
- `build_sort(sort_by, sort_order)` → Beanie sort token (`+field` / `-field`).

---

## Compatibility Rules

1. **Do not rename response keys.** `success`, `data`, `message`, `meta`, `error.code`, `error.message`, `error.details`, and all `PaginationMeta` fields are contract-stable. Renaming breaks frontend consumers.
2. **Do not remove or reorder envelope fields.** Additive-only changes are safe; removal or type changes require a versioning plan.
3. **Sort whitelist changes are breaking.** Adding a new sort key is safe. Removing an existing `Literal` value breaks clients that pass it.
4. **`maxLimit=100` is a hard cap** (`le=100` in `PageQuery.limit`). Do not raise it without performance review.
5. **Error codes are stable.** `AppError.code` strings are parsed by clients; do not rename them across a live deployment.
6. **File size limit**: no source file > 250 lines. Split routes, schemas, controllers, services, or query helpers before adding behavior to a file at the limit.
7. **New domains**: mirror the existing route/controller/service/schema structure (`scaffold-standards`, `domain-scaffold-patterns`).

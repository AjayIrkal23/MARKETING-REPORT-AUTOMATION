# Backend Conventions

Quick-reference for naming, file-size limits, type discipline, and source-driven
verification. Governing skills: `backend-standards-always-follow`,
`source-driven-development`, `backend-code-review`.

---

## Naming

### Modules and packages

| Layer | Convention | Example |
|-------|-----------|---------|
| Python files | `snake_case.py` | `login.py`, `query.py`, `seed.py` |
| Domain packages | singular noun | `auth/`, `user/`, `meta/` |
| Service files | verb (the action) | `login.py`, `list.py`, `seed.py` |
| Controller files | domain noun | `auth.py`, `user.py`, `meta.py` |
| Route files | domain noun | `auth.py`, `user.py`, `meta.py` |

### Pydantic schemas

| Purpose | Suffix convention | Real examples |
|---------|-----------------|---------------|
| API request body | `Request` | `LoginRequest` |
| API response payload (inside envelope) | `Data` or domain noun | `AuthUser`, `UserPublic`, `PingData`, `HealthData`, `RootData` |
| Query-param model | `Query` | `UserListQuery`, `PageQuery` |
| Beanie Document | no suffix — class name = entity | `User` |
| Sort-key type alias | `<Domain>SortBy` | `UserSortBy` |

### Field names

Follow the existing model exactly — do **not** rename fields in DTOs without updating
the model and all usages. Fields that exist on `User`:

```
emailid   password   lastlogined   isAdmin
```

`emailid` (not `email`) is the unique login key. `password` holds a bcrypt hash — never
a plain string. Keep names consistent across model, schema, and response.

---

## File Size

**Hard cap: every manually maintained source file must be ≤ 250 lines.**

- Before adding behavior to a file that is already ≥ 250 lines, split it first.
- Services are one action per file (`login.py`, `list.py`, `seed.py`) specifically to
  keep them small and independently testable.
- Controllers are deliberately thin (< 15 lines is normal — see `controllers/auth.py`).
- No exceptions without an explicit, documented blocker.

---

## Type Discipline

- **Full annotations everywhere** — parameters, return types, and class attributes.
  Use `from __future__ import annotations` at the top of every module.
- **Pydantic v2 `BaseModel`** for every request body, query-param model, and response
  payload. Never pass raw `dict` across layer boundaries.
- **`EmailStr`** (from `pydantic`) for email fields; validated on ingest.
- **`Literal`** for whitelisted enumerations — e.g. sort keys:

  ```python
  UserSortBy = Literal["emailid", "lastlogined", "isAdmin"]
  ```

- Beanie `Document` subclasses ARE the persistence model; never instantiate raw dicts
  and save them to Mongo.
- `SuccessEnvelope[T]` and `ErrorEnvelope` (from `core/responses.py`) are the only
  shapes controllers may return. Use the `success()` factory:

  ```python
  from ..core.responses import success
  return success(user, message="Login successful")
  ```

---

## Response Envelope

Every JSON endpoint returns one of these two shapes (from `core/responses.py`):

**Success**
```json
{ "success": true, "data": <T>, "message": "<str>", "meta": <null | PaginationMeta> }
```

**Error**
```json
{ "success": false, "error": { "code": "<STR>", "message": "<str>", "details": <null | any> } }
```

**`PaginationMeta`** fields on paginated list responses:
`page`, `limit`, `total`, `totalPages`, `sortBy`, `sortOrder`.

List endpoint query params: `page` (default 1), `limit` (default 20, max 100),
`sortBy` (whitelisted `Literal`), `sortOrder` (`"asc" | "desc"`), `q` (optional search).
Unknown `sortBy` values are rejected (Pydantic validation error → 422).

---

## Layering Rules

Request flow: **route → controller → service → model/core → envelope**. One
responsibility per layer; crossing layers is a bug.

| Layer | Location | Responsibility |
|-------|----------|---------------|
| Routes | `routes/<domain>.py` | Register `APIRouter`, declare path + method, inject query/body via FastAPI |
| Controllers | `controllers/<domain>.py` | Receive validated input, call one service, wrap result in `success()` |
| Services | `services/<domain>/<action>.py` | Business logic, DB access; transport-free; raise `AppError` subclasses |
| Schemas | `schemas/<domain>.py` | Pydantic DTOs for I/O; no DB calls |
| Models | `models/<entity>.py` | Beanie `Document`; one file per entity |
| Core | `core/*.py` | Cross-cutting: config, database, security, errors, responses, exception handlers |

**Controllers must not contain business logic.** If a controller does anything beyond
calling a service and wrapping the result, move that logic to a service.

---

## Error Handling

Services raise typed subclasses of `AppError` (`core/errors.py`):

| Class | HTTP | `code` |
|-------|------|--------|
| `ValidationError` | 400 | `VALIDATION_ERROR` |
| `UnauthorizedError` | 401 | `UNAUTHORIZED` |
| `ForbiddenError` | 403 | `FORBIDDEN` |
| `NotFoundError` | 404 | `NOT_FOUND` |
| `ConflictError` | 409 | `CONFLICT` |
| `AppError` (base) | 500 | `INTERNAL_ERROR` |

Centralized handlers in `core/exception_handlers.py` map these to `ErrorEnvelope`.
**Never let raw Python exceptions, DB driver errors, or stack traces reach the client.**
Auth errors use a single generic message to prevent user enumeration (OWASP A01).

---

## Source-Driven Verification

Verify all framework API calls against the **installed** versions before writing code.
Installed versions (from `requirements.txt`):

| Package | Version |
|---------|---------|
| FastAPI | 0.136.3 |
| Pydantic | 2.13.4 |
| Beanie | 2.1.0 |
| pymongo | 4.17.0 |
| bcrypt | 5.0.0 |
| Uvicorn | 0.48.0 |

**Critical**: Beanie 2.x uses `pymongo.AsyncMongoClient` — Motor is **retired** in
Beanie 2.x. Never add `motor` to `requirements.txt` or import from `motor.*`. The
correct import is `from pymongo import AsyncMongoClient` (see `core/database.py`).

When in doubt: read the installed source in `.venv/` or fetch the versioned official
docs. Do not implement from training-data memory — APIs change between major versions.

---

## Anti-patterns

| Anti-pattern | Why it is wrong | Correct alternative |
|---|---|---|
| Business logic in a controller | Breaks layering; untestable | Move to `services/<domain>/<action>.py` |
| Raw `dict` across layer boundaries | No type safety; no validation | Use a Pydantic `BaseModel` DTO |
| Importing `motor` or `AsyncIOMotorClient` | Motor is retired in Beanie 2.x | Use `pymongo.AsyncMongoClient` |
| Returning raw exceptions to the client | Leaks internals; security risk | Raise `AppError` subclass; let handlers format it |
| Storing plaintext passwords | Critical security flaw | Use `core.security.hash_password` (bcrypt 5) |
| Distinct messages for bad email vs bad password | User enumeration (OWASP A01) | Single generic `"Invalid email or password"` |
| Unbounded list query (no `limit`) | DoS vector on real datasets | Enforce `maxLimit=100`; default `limit=20` |
| `sortBy` accepted without a whitelist | Injection / info-leak | Use `Literal["emailid", ...]` on the query schema |
| File > 250 lines | Hard cap violation | Split into focused modules before adding behavior |
| System Python instead of `.venv` | Dependency pollution / wrong versions | Always use `backend/.venv/bin/python` |
| Inventing file paths without reading | Hallucinated symbols break at runtime | Verify with `ls` / `Read` before referencing any path |

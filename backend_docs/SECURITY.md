# Backend Security

Governing skills: `owasp-security` (OWASP Top 10:2025, ASVS 5.0) and `security-and-hardening`. Every rule below maps to code that already exists on disk — verified as of 2026-05-30.

---

## Passwords

**File:** `app/core/security.py`

Passwords are hashed with **bcrypt** (library `bcrypt 5.0.0`). Plaintext is never stored, logged, or returned.

```python
# hash on write (seed, registration)
hash_password(plain: str) -> str      # bcrypt.hashpw + gensalt, utf-8 encoded

# verify on login
verify_password(plain: str, hashed: str) -> bool   # bcrypt.checkpw; returns False on ValueError/TypeError
```

| Rule | Status |
|------|--------|
| bcrypt with per-password salt | Done — `gensalt()` called per hash |
| Never store plaintext | Done — `User.password` column always holds a bcrypt hash |
| Never log plaintext | Done — password not present in `AuthUser` or any log call |
| Never return hash to client | Done — `AuthUser` schema omits `password` |
| Hash before insert in seed | Done — `seed_admin()` calls `hash_password()` before `User.insert()` |

---

## Auth

**Files:** `app/services/auth/login.py`, `app/schemas/auth.py`, `app/core/errors.py`

`POST /auth/login` body: `{emailid: EmailStr, password: str (min_length=1)}`.

```python
# services/auth/login.py — single generic error for both unknown-email and wrong-password
user = await User.find_one(User.emailid == payload.emailid)
if user is None or not verify_password(payload.password, user.password):
    raise UnauthorizedError("Invalid email or password")   # 401, no enumeration
```

- **No user enumeration:** missing email and wrong password produce the identical `401 UNAUTHORIZED / UNAUTHORIZED / "Invalid email or password"` response.
- **`lastlogined` stamped** (UTC) on every successful login via `user.save()`.
- **Response shape:** `AuthUser {emailid, isAdmin, lastlogined}` — password hash is never returned.
- **No session/JWT issued yet.** Login validates and stamps but does not mint a token. Add a token service when needed.

---

## Secrets

**File:** `app/core/config.py` (`Settings` Pydantic model, loaded once via `@lru_cache`)

| Secret | Source | Default (local dev only) |
|--------|--------|--------------------------|
| `MONGODB_URI` | env / `.env` | `mongodb://localhost:27017` |
| `MONGODB_DB` | env / `.env` | `marketing_report` |
| `SEED_ADMIN_EMAIL` | env / `.env` | `ajayirkal@docketrun.com` |
| `SEED_ADMIN_PASSWORD` | env / `.env` | `loloklol` |

**Rules:**
- `.env` is **gitignored** — never committed.
- No secrets appear in application source outside `config.py` defaults.
- `get_settings()` is the single import point; no `os.getenv()` calls scattered through service code.
- In production: set all four vars in the environment or a secrets manager; override the weak `loloklol` default immediately.

---

## Input Validation

**Files:** `app/schemas/` (all domains), `app/core/exception_handlers.py`

Every external input is validated by a **Pydantic v2 BaseModel** before reaching a controller or service. FastAPI enforces this at the route boundary.

| Endpoint | Schema | Key constraints |
|----------|--------|-----------------|
| `POST /auth/login` | `LoginRequest` | `emailid: EmailStr`, `password: str (min_length=1)` |
| `GET /users` | `PageQuery` (common) | `page`, `limit` (int), `sortBy: Literal[...]`, `sortOrder`, `q: str` |

`RequestValidationError` is caught by the centralized handler and returns:

```json
{"success": false, "error": {"code": "VALIDATION_ERROR", "message": "Request validation failed", "details": [...]}}
```

Stack traces are never included. Pydantic `details` list contains field-level error objects only.

**Key points:**
- Sort keys are a `Literal` whitelist (`emailid | lastlogined | isAdmin`) — unknown `sortBy` values are rejected at schema parse time, not by conditional logic.
- `maxLimit=100` is enforced in `PageQuery`; clients cannot request unbounded pages.
- `EmailStr` (from `email-validator 2.3.0`) rejects malformed email addresses at the boundary.

---

## CORS

**Files:** `app/core/config.py` (`Settings.cors_origins`), `app/main.py` (`CORSMiddleware`)

```python
# main.py — wired in create_app()
app.add_middleware(
    CORSMiddleware,
    allow_origins=list(settings.cors_origins),   # explicit allowlist
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

**Allowed origins (dev only):**

| Origin | Purpose |
|--------|---------|
| `http://localhost:5173` | Vite dev server |
| `http://127.0.0.1:5173` | Vite dev server (loopback alias) |
| `http://localhost:4173` | Vite preview server |

- `allow_credentials=True` is required for cookie-based sessions (future) and is safe because the origin list is explicit, not `*`.
- **Production:** replace with the real production domain before deployment. Do not add `*` to `allow_origins` while `allow_credentials=True` — browsers will reject it and it violates OWASP A02.

---

## Error Handling

**File:** `app/core/exception_handlers.py`, `app/core/errors.py`

All errors are normalized through `register_exception_handlers()` into the standard envelope. Stack traces and driver internals are **never** sent to the client.

| Handler | Catches | HTTP code |
|---------|---------|-----------|
| `_handle_app_error` | `AppError` subclasses | Per-error `status_code` (400/401/403/404/409/500) |
| `_handle_validation_error` | `RequestValidationError` | 400 |
| `_handle_http_exception` | `StarletteHTTPException` | Passthrough |
| `_handle_unexpected` | Any `Exception` | 500 — logs server-side, generic message to client |

Services raise only typed `AppError` subclasses (`ValidationError`, `UnauthorizedError`, `ForbiddenError`, `NotFoundError`, `ConflictError`). Raw `Exception` raises in service code are a bug.

---

## Hardening Checklist

| Check | Status | Notes |
|-------|--------|-------|
| Passwords hashed with bcrypt | Done | `core/security.py` |
| No plaintext passwords in DB | Done | `seed_admin()` hashes before insert |
| No user enumeration on login | Done | Single generic `UnauthorizedError` |
| No secrets in source tree | Done | `.env` gitignored; `Settings` reads env vars |
| Pydantic validation on all external input | Done | All routes use schema DTOs |
| Sort-key whitelist on list endpoint | Done | `Literal[...]` in schema |
| `maxLimit=100` on pagination | Done | `PageQuery` |
| No stack traces to clients | Done | Centralized handlers strip internals |
| CORS restricted to known origins | Done | 3 localhost origins only |
| No session/JWT yet | Pending | Login stamps `lastlogined` but no token issued |
| Security headers (CSP, HSTS, X-Frame-Options) | Not set | Add via middleware before production |
| Rate limiting on `/auth/login` | Not set | Add `slowapi` or reverse-proxy throttle |
| Seed-admin password override in prod | Required | Change `SEED_ADMIN_PASSWORD` env var; default `loloklol` is insecure |
| `allow_methods=["*"]` narrowed | Optional | Restrict to `["GET","POST"]` when route set is stable |

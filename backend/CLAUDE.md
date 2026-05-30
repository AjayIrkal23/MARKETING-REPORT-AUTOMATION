# backend/ — Agent Surface Guide

FastAPI service for the JSW Marketing Report Automation dashboard.
Layered architecture (`routes → controllers → services → schemas → models`, with
`core/` for cross-cutting concerns), MongoDB-backed via Beanie. Implements the
**meta** (ping/health), **auth** (login), and **user** (list + admin seed) domains.

> **Every backend change must apply the full backend craft-skill set** (all 27 —
> see `~/.claude/rules/agent-lifecycle-routing.md`). The structure below is the
> realization of those skills; keep it intact and extend by mirroring it.

---

## Stack

| Component | Version |
|---|---|
| Python | 3.13.7 |
| FastAPI | 0.136.3 |
| Starlette | 1.2.0 |
| Pydantic | 2.13.4 |
| Uvicorn (standard: uvloop / httptools / websockets) | 0.48.0 |
| MongoDB driver | pymongo 4.17.0 (`AsyncMongoClient`) |
| ODM | Beanie 2.1.0 (Pydantic v2 documents; Motor retired in 2.x) |
| Password hashing | bcrypt 5.0.0 |
| Email validation | email-validator 2.3.0 (`EmailStr`) |

All deps are fully pinned in `requirements.txt` (matches `pip freeze` exactly).

### MongoDB

- Connection: `MONGODB_URI` (default `mongodb://localhost:27017`), DB `MONGODB_DB`
  (default `marketing_report`). Env vars / live `.env` override (`.env` is gitignored).
- Opened on app startup via the `lifespan` hook in `app/main.py`
  (`core.database.init_db` → `init_beanie`), closed on shutdown (`close_db`). Mongo
  failures at startup are logged but **non-fatal** so ping/health still boot without a DB.
- Seed admin (`app/services/user/seed.py`) runs on startup and standalone via
  `./.venv/bin/python -m app.scripts.seed`. Idempotent — keyed on unique `emailid`.

---

## Setup & Run

```bash
# One-time: create venv and install deps
cd backend
python3 -m venv .venv
./.venv/bin/pip install -r requirements.txt

# Start server (hot-reload)
./run.sh
# OR directly:
./.venv/bin/uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc
- `.venv/` is `.gitignore`d — always recreate from `requirements.txt`.

---

## Endpoints

All JSON endpoints return the standard envelope (`{success, data, message, meta}` on
success, `{success:false, error:{code,message,details}}` on error). The `data` column
below is the payload inside that envelope. The WebSocket is exempt (raw text frames).

| Method | Path | `data` | Notes |
|---|---|---|---|
| GET | `/` | `RootData` | Service banner: `service`, `version`, `docs`, `ping` |
| GET | `/health` | `HealthData` | `status`, `version`, `uptime_seconds` (float) |
| GET | `/ping` | `PingData` | `message="pong"`, `seq` (auto-increment), `timestamp` (ISO-8601 UTC) |
| WS | `/ws/ping` | text frame | `"pong"` for `"ping"`, else `"echo:<text>"` |
| POST | `/auth/login` | `AuthUser` | Body `{emailid, password}`; verifies bcrypt hash, stamps `lastlogined`; `401 UNAUTHORIZED` on bad creds (generic message) |
| GET | `/users` | `UserPublic[]` | Backend-driven paginated list; pagination in `meta`. Query: `page,limit,sortBy(emailid\|lastlogined\|isAdmin),sortOrder,q` |

---

## Code Layout

Layered — one responsibility per layer, every file ≤250 lines. Request flow is
**route → controller → service → (model / core) → envelope**.

```
backend/
  .env                        # live local config (gitignored)
  requirements.txt
  run.sh                      # exec uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
  app/
    __init__.py               # __version__
    main.py                   # create_app(): CORS, exception handlers, lifespan, router include
    core/                     # cross-cutting concerns
      config.py               # Settings (env / .env)
      database.py             # init_db / close_db — AsyncMongoClient + Beanie
      security.py             # hash_password / verify_password (bcrypt)
      errors.py               # AppError taxonomy (Validation/Unauthorized/NotFound/Conflict/…)
      responses.py            # SuccessEnvelope / ErrorEnvelope / PaginationMeta + success()
      exception_handlers.py   # centralized handlers -> error envelope
    models/
      user.py                 # User Beanie Document (collection "users")
    schemas/                  # Pydantic I/O DTOs — the typed contract layer
      common.py               # PageQuery (pagination base)
      meta.py  auth.py  user.py
    services/                 # business logic; transport-free; raise typed errors
      meta/ping.py
      auth/login.py
      user/list.py  user/seed.py
    controllers/              # thin: validated input -> service -> envelope
      meta.py  auth.py  user.py
    routes/                   # APIRouter registration per domain
      __init__.py             # api_router aggregator
      meta.py  auth.py  user.py
    utils/
      user/query.py           # list filter + sort-token builders
    scripts/
      seed.py                 # `python -m app.scripts.seed`
```

Add a new domain by mirroring the route/controller/service/schema set
(`scaffold-standards`, `domain-scaffold-patterns`).

### User model (`app/models/user.py`, collection `users`)

```python
class User(Document):
    emailid: Annotated[EmailStr, Indexed(unique=True)]  # login key, unique index
    password: str            # bcrypt hash — NEVER plaintext (see core.security)
    lastlogined: datetime | None = None
    isAdmin: bool = False
```

### CORS origins (allow_credentials=True, methods/headers="*")

Defined in `core/config.py` (`Settings.cors_origins`):

- `http://localhost:5173` (Vite dev)
- `http://127.0.0.1:5173`
- `http://localhost:4173` (Vite preview)

---

## Current Scope

- Domains implemented end-to-end: **meta** (`/`, `/health`, `/ping`, `/ws/ping`),
  **auth** (`POST /auth/login`), **user** (`GET /users` + admin seed).
- MongoDB via Beanie: `User` model + idempotent admin seed. No migrations (schemaless;
  Beanie creates the unique `emailid` index on init).
- Standard envelope on every JSON endpoint; typed `AppError` taxonomy → centralized
  handlers; backend-driven pagination + sort whitelist on the list endpoint.
- No session/JWT issuance yet — `/auth/login` verifies credentials and stamps
  `lastlogined` but does not mint a token. Add a token/session service when needed.
- `_ping_counter` is in-process only (in `services/meta/ping.py`); resets on restart.

---

## Mandatory Backend Rules

**Apply every backend craft skill on every backend change** — all 27, not just when
convenient. They are enforced via `~/.claude/` hooks; this codebase is their realization.
Full list: `~/.claude/rules/agent-lifecycle-routing.md`.

1. **Layering**: route → controller → service → schema/model. Thin controllers; **all**
   business logic + DB access live in services (`service-layer-standards`).
2. **Contract**: success `{success, data, message, meta}`; error `{success:false,
   error:{code, message, details}}` (`api-contract-standards`). Don't rename response keys casually.
3. **Errors**: services raise typed `AppError` subclasses; never leak raw exceptions or
   stack traces — the centralized handlers map them (`backend-error-handling`).
4. **List endpoints**: backend-driven pagination, sort whitelist (Pydantic `Literal`),
   unknown keys rejected, `maxLimit=100` (`backend-api-standards`).
5. **Security**: bcrypt hashes, generic auth errors (no user enumeration), no secrets in
   source, validate every external input (`owasp-security`, `security-and-hardening`).
6. **File size**: no file > 250 lines — split before adding behavior.
7. **Type discipline**: full annotations; Pydantic schemas for all I/O.
8. **Source-driven**: verify framework APIs against the *installed* version before coding
   (`source-driven-development`) — e.g. Beanie 2.x uses `AsyncMongoClient`, not Motor.

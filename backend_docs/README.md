# Backend Docs Index

Orientation hub for the JSW Marketing Report Automation backend — FastAPI + MongoDB service powering the West-Central region dashboard. Governed by `backend-standards-always-follow` and the full 27-skill backend craft set.

---

## Overview

Layered FastAPI service (Python 3.13). Request flow: **route → controller → service → schema/model → envelope**. MongoDB via Beanie 2.x (Pydantic v2 documents). Three domains implemented end-to-end: **meta**, **auth**, **user**. Every JSON response uses the standard success/error envelope; controllers stay thin; all business logic lives in services.

- API docs: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

---

## Stack

| Component | Version | Notes |
|---|---|---|
| Python | 3.13.7 | Use `backend/.venv` — never system Python |
| FastAPI | 0.136.3 | `create_app()` factory in `app/main.py` |
| Starlette | 1.2.0 | Underlying ASGI framework |
| Pydantic | 2.13.4 | v2 — all schemas use `BaseModel` |
| Uvicorn | 0.48.0 | `[standard]`: uvloop + httptools + websockets |
| pymongo | 4.17.0 | `AsyncMongoClient` — Motor is RETIRED in Beanie 2.x |
| Beanie | 2.1.0 | ODM; documents = `core.database.init_db` → `init_beanie` |
| bcrypt | 5.0.0 | `core.security`: `hash_password` / `verify_password` |
| email-validator | 2.3.0 | `EmailStr` on `User.emailid` |
| python-dotenv | 1.2.2 | `.env` (gitignored) → `core.config.Settings` |

Full pin list: `backend/requirements.txt`.

---

## Doc Map

| File | Contents |
|---|---|
| `backend_docs/README.md` ← *you are here* | Orientation, stack, setup, golden rules |
| `backend/CLAUDE.md` | Agent surface guide: layering diagram, endpoint table, mandatory rules, code layout |
| `backend/README.md` | Human quickstart: setup, run, endpoint table, curl check |
| `macro_docs/README.md` | Domain data dictionary for the three SAP Excel sources |

> Additional topic docs (errors, contracts, auth, users) will land here as `backend_docs/<topic>.md`.

---

## Setup & Run

```bash
# One-time venv
cd backend
python3 -m venv .venv
./.venv/bin/pip install -r requirements.txt

# Start (hot-reload, port 8000)
./run.sh

# Seed admin user (idempotent — safe to re-run)
./.venv/bin/python -m app.scripts.seed
```

`run.sh` is self-contained — it `cd`s to its own directory before calling uvicorn. `.venv/` is gitignored; always recreate from `requirements.txt`.

### Environment variables

| Var | Default | Purpose |
|---|---|---|
| `MONGODB_URI` | `mongodb://localhost:27017` | MongoDB connection string |
| `MONGODB_DB` | `marketing_report` | Database name |

Override via `.env` in `backend/` (gitignored, sourced by `python-dotenv`).

---

## Endpoints

All JSON endpoints wrap `data` in the standard envelope (see Golden Rules §1). The WebSocket uses raw text frames.

| Method | Path | `data` shape | Notes |
|---|---|---|---|
| GET | `/` | `RootData` | Service banner |
| GET | `/health` | `HealthData` | `status`, `version`, `uptime_seconds` |
| GET | `/ping` | `PingData` | `message="pong"`, `seq`, `timestamp` |
| WS | `/ws/ping` | text frame | `"ping"` → `"pong"`, else `"echo:<text>"` |
| POST | `/auth/login` | `AuthUser` | Body: `{emailid, password}`; bcrypt verify; stamps `lastlogined`; generic 401 (no enumeration) |
| GET | `/users` | `UserPublic[]` + `meta` | Paginated; query: `page`, `limit`, `sortBy` (`emailid`\|`lastlogined`\|`isAdmin`), `sortOrder`, `q`; maxLimit 100 |

---

## Code Layout

```
backend/app/
  __init__.py               # __version__
  main.py                   # create_app(): CORS, lifespan, exception handlers, router
  core/
    config.py               # Settings (env/.env)
    database.py             # init_db / close_db (AsyncMongoClient + Beanie)
    security.py             # hash_password / verify_password (bcrypt)
    errors.py               # AppError taxonomy
    responses.py            # SuccessEnvelope / ErrorEnvelope / PaginationMeta / success()
    exception_handlers.py   # centralized handlers → error envelope
  models/
    user.py                 # User Beanie Document (collection "users")
  schemas/
    common.py               # PageQuery (pagination base)
    meta.py  auth.py  user.py
  services/                 # business logic; transport-free; raise typed AppError
    meta/ping.py
    auth/login.py
    user/list.py  user/seed.py
  controllers/              # thin: validated input → service → envelope
    meta.py  auth.py  user.py
  routes/                   # APIRouter per domain
    __init__.py             # api_router aggregator
    meta.py  auth.py  user.py
  utils/user/query.py       # filter + sort-token builders for list endpoint
  scripts/seed.py           # `python -m app.scripts.seed`
```

**User model** (`models/user.py`, collection `users`):

```python
class User(Document):
    emailid: Annotated[EmailStr, Indexed(unique=True)]  # login key
    password: str            # bcrypt hash — NEVER plaintext
    lastlogined: datetime | None = None
    isAdmin: bool = False
```

**To add a new domain**: mirror the `routes/` + `controllers/` + `services/<domain>/` + `schemas/<domain>.py` set — see `scaffold-standards` and `domain-scaffold-patterns`.

---

## Golden Rules

Sourced from `backend-standards-always-follow` and the 27-skill backend craft set. Non-negotiable on every backend change.

1. **Envelope**: success → `{success, data, message, meta}`; error → `{success: false, error: {code, message, details}}`. Never rename keys.
2. **Layering**: route → controller → service → schema/model. Controllers are thin glue only. All business logic + DB access lives in `services/`. (`service-layer-standards`)
3. **Errors**: services raise typed `AppError` subclasses from `core.errors`. Never let raw exceptions or stack traces reach the client — `exception_handlers.py` maps them. (`backend-error-handling`)
4. **List endpoints**: backend-driven pagination; sort keys whitelisted via Pydantic `Literal`; unknown `sortBy` values rejected; `maxLimit = 100`. (`backend-api-standards`)
5. **Security**: bcrypt hashes always; generic 401 messages (no user enumeration); validate every external input; no secrets in source. (`owasp-security`, `security-and-hardening`)
6. **File size**: every manually maintained source file ≤ 250 lines. Split before adding behavior.
7. **Type discipline**: full annotations throughout; Pydantic schemas for all I/O DTOs.
8. **Motor is retired**: Beanie 2.x uses `AsyncMongoClient` (pymongo). Never add `motor` as a dependency.
9. **Source-driven**: verify FastAPI / Beanie / Pydantic APIs against the installed version before coding. (`source-driven-development`)
10. **No guessing**: inspect existing routes, controllers, schemas, services, and models before changing behavior. Preserve current shapes unless the task explicitly changes them.

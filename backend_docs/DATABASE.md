# Backend Database (MongoDB/Beanie)

Persistence layer: Beanie 2.x ODM over `pymongo.AsyncMongoClient`, managing the
`users` collection with a single `User` document model, startup-tolerant connection
lifecycle, and idempotent admin seeding.

> Governing skills: **source-driven-development**, **backend-standards-always-follow**,
> **backend-performance-standards**, **postgres-patterns** (schema hygiene analogue for Mongo),
> **owasp-security** (no plaintext passwords, no secrets in source).

---

## Beanie 2.x — pymongo AsyncMongoClient (Motor is RETIRED)

| Fact | Value |
|------|-------|
| ODM | Beanie 2.1.0 |
| Driver | pymongo 4.17.0 `AsyncMongoClient` |
| Motor | **Retired in Beanie 2.x — never add motor as a dependency** |
| Pydantic compat | Pydantic v2 (Beanie 2.x dropped v1 support) |

Beanie 2.x switched from Motor to pymongo's native async client. Import path:

```python
from pymongo import AsyncMongoClient      # correct
from beanie import init_beanie, Document  # correct
# from motor.motor_asyncio import ...     # WRONG — Motor is retired
```

---

## Connection

### Environment variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `MONGODB_URI` | `mongodb://localhost:27017` | Full MongoDB connection URI |
| `MONGODB_DB` | `marketing_report` | Database name |

Resolved once by `get_settings()` (`app/core/config.py`, `@lru_cache` singleton).
Override via shell env or a local `.env` file (gitignored). **Never commit credentials.**

### Lifecycle — `app/core/database.py`

```python
_client: AsyncMongoClient | None = None

async def init_db() -> None:
    global _client
    settings = get_settings()
    _client = AsyncMongoClient(settings.mongodb_uri)
    await init_beanie(
        database=_client[settings.mongodb_db],
        document_models=DOCUMENT_MODELS,
    )

async def close_db() -> None:
    global _client
    if _client is not None:
        await _client.close()
        _client = None
```

`DOCUMENT_MODELS` is the single authoritative list — add every new `Document` subclass here.

### Startup tolerance — `app/main.py` lifespan

```python
@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    try:
        await init_db()
        await seed_admin()
    except Exception:
        logger.exception("MongoDB init/seed failed; continuing without a database.")
    try:
        yield
    finally:
        await close_db()
```

MongoDB failures at startup are **logged but non-fatal** — `/ping` and `/health`
continue to respond even when no database is available (useful for local dev without Mongo).

---

## User Model

**File:** `app/models/user.py` | **Collection:** `users`

```python
class User(Document):
    emailid: Annotated[EmailStr, Indexed(unique=True)]
    password: str            # bcrypt hash — NEVER plaintext
    lastlogined: datetime | None = None
    isAdmin: bool = False

    class Settings:
        name = "users"
```

| Field | Type | Constraint | Notes |
|-------|------|-----------|-------|
| `emailid` | `EmailStr` | Unique index (Beanie `Indexed`) | Natural login key; validated by `email-validator` |
| `password` | `str` | — | Stores bcrypt hash only — use `core.security.hash_password()` |
| `lastlogined` | `datetime \| None` | — | Stamped by `POST /auth/login` on successful verify |
| `isAdmin` | `bool` | Default `False` | Seed admin is the only `True` record at bootstrap |

**Index:** Beanie calls `create_index` on the unique `emailid` field automatically
during `init_beanie` — no migration files needed (schemaless).

**Security rule (OWASP A02):** `password` must be a bcrypt hash from
`app.core.security.hash_password()`. The `verify_password()` helper in the same
module is the only place passwords are compared. Generic 401 responses prevent
user enumeration.

---

## Seeding

### What it does

`app/services/user/seed.py` — `seed_admin()` — creates the admin user if absent,
returns the existing record if already present. **Fully idempotent** — keyed on
the unique `emailid` index; no duplicates possible.

### Admin credentials (env-controlled)

| Variable | Default | Override in production |
|----------|---------|----------------------|
| `SEED_ADMIN_EMAIL` | `ajayirkal@docketrun.com` | Set `SEED_ADMIN_EMAIL` in env |
| `SEED_ADMIN_PASSWORD` | *(default in config.py)* | **Always override via env in prod** |

Password is hashed with `hash_password()` before `insert()` — default value is never
stored as plaintext.

### Run standalone

```bash
# From backend/
./.venv/bin/python -m app.scripts.seed
```

`app/scripts/seed.py` calls `init_db()` → `seed_admin()` → `close_db()` then exits.
Safe to run repeatedly. Also runs automatically on every app startup (inside `lifespan`).

---

## Adding a Model

1. Create `app/models/<domain>.py` — subclass `beanie.Document`, set `Settings.name`.
2. Import it in `app/models/__init__.py` (keep `__all__` tidy).
3. Append to `DOCUMENT_MODELS` in `app/core/database.py` — Beanie registers
   all indexes declared with `Indexed(...)` during the next `init_beanie` call.
4. Add corresponding Pydantic DTOs in `app/schemas/<domain>.py` (never expose
   the raw `Document` class across the API boundary).
5. Keep every file ≤ 250 lines — split before extending.

```python
# app/core/database.py
from ..models import User, YourNewModel   # step 3

DOCUMENT_MODELS = [User, YourNewModel]
```

No manual `CREATE COLLECTION` or index DDL — Beanie handles it on startup.

# Audit Logging — Implementation SPEC (single source of truth)

> Every agent building this feature MUST read this file in full first, then read the
> referenced existing file(s) to mirror conventions EXACTLY. This file is the contract;
> the referenced files are the style guide. Do not invent new patterns.

Project root: `/DATA/CODE_FILES/MARKETING REPORT AUTOMATION`
- Backend root: `backend/` (FastAPI + MongoDB/Beanie 2.x layered architecture)
- Frontend root: `frontend/` (Vite + React 19 + TS + Tailwind v4 + shadcn/ui, plain-fetch API client)

## Goal

App-wide audit logging. Capture EVERY backend HTTP request/response automatically (via
middleware — new endpoints get covered with zero extra code), plus server startup/shutdown
and cron jobs. Expose an **admin-only** Audit Logs page in the frontend (under "Administrator
Config"), visually/structurally identical to the existing User Management page, with
backend-driven search + select, server-side pagination, and a view-details dialog.

Hard rules (enforced):
- Every file ≤ 250 lines. Split before exceeding.
- Backend envelope: success `{success,data,message,meta}`; error `{success:false,error:{code,message,details}}`.
- Backend list endpoints: backend-driven pagination, `Literal` sort whitelist, `maxLimit=100`, reject unknown query keys.
- Services raise typed `AppError` subclasses; never leak raw exceptions.
- Audit writes MUST NEVER raise into the request path or block the response meaningfully.
- Redact secrets (password, otp, token, cookie, authorization, secret) in captured payloads; cap body size.
- Frontend: no client-side filtering/sorting/pagination of server data — send query params. Semantic tokens only (no raw hex). Typed Redux hooks. API only via `src/api/*` modules.
- Full type annotations (Python) / strict TS. Match existing import ordering & docstring style.

---

# PART A — BACKEND

## A0. Shared taxonomy (use these EXACT literal values everywhere, BE + FE)

- `AuditCategory` = `"http" | "auth" | "admin" | "data" | "system" | "cron" | "security"`
- `AuditOutcome`  = `"success" | "failure" | "error"`
- `AuditSource`   = `"http" | "system" | "cron" | "service"`

Derivation rules used by the middleware:
- category: path starts with `/auth` → `"auth"`; starts with `/admin` → `"admin"`; else `"http"`.
- outcome from status_code: `< 400` → `success`; `400..499` → `failure`; `>= 500` → `error`.
- action for HTTP: `"http.request"`.
- request_id: `uuid.uuid4().hex`.
- timestamp: `datetime.now(timezone.utc)`.

## A1. Model — `backend/app/models/audit_log.py` (NEW)

Mirror `backend/app/models/user.py` style (Beanie `Document`, `Annotated[..., Indexed()]`,
`Field(default_factory=...)`, inner `class Settings: name = ...`).

```python
from __future__ import annotations
from datetime import datetime, timezone
from typing import Annotated, Any, Literal
from beanie import Document, Indexed
from pydantic import Field

AuditCategory = Literal["http", "auth", "admin", "data", "system", "cron", "security"]
AuditOutcome = Literal["success", "failure", "error"]
AuditSource = Literal["http", "system", "cron", "service"]

def _now_utc() -> datetime:
    return datetime.now(timezone.utc)

class AuditLog(Document):
    timestamp: Annotated[datetime, Indexed()] = Field(default_factory=_now_utc)
    category: Annotated[str, Indexed()]            # AuditCategory value
    action: Annotated[str, Indexed()]              # e.g. "http.request", "system.startup"
    summary: str = ""
    outcome: Annotated[str, Indexed()] = "success" # AuditOutcome value
    source: str = "service"                        # AuditSource value
    # HTTP context (None for non-http events)
    method: str | None = None
    path: Annotated[str | None, Indexed()] = None
    route: str | None = None                       # matched route template ("triggered by route")
    status_code: Annotated[int | None, Indexed()] = None
    duration_ms: float | None = None
    # actor (resolved from session cookie; None for anonymous/system)
    actor_email: Annotated[str | None, Indexed()] = None
    actor_is_admin: bool | None = None
    ip: str | None = None
    user_agent: str | None = None
    request_id: str | None = None
    # payloads (redacted + size-capped)
    request_meta: dict[str, Any] | None = None     # {"query":..., "headers":..., "body":...}
    response_meta: dict[str, Any] | None = None     # {"body":..., "bytes": int}
    error: dict[str, Any] | None = None             # {"code","message","details"}
    extra: dict[str, Any] | None = None             # arbitrary semantic context

    class Settings:
        name = "audit_logs"
```

## A2. Redaction — `backend/app/services/audit/redact.py` (NEW)

```python
SENSITIVE_KEYS = frozenset({
    "password","new_password","current_password","old_password","confirm_password",
    "otp","otp_code","otp_hash","code","token","access_token","refresh_token",
    "secret","session","app_session","authorization","cookie","set-cookie",
    "x-api-key","api_key","apikey","session_secret",
})
REDACTED = "***REDACTED***"
```
Functions:
- `redact(value: Any, depth: int = 0) -> Any` — recursively copy dict/list; if a dict key
  (lowercased) is in `SENSITIVE_KEYS`, replace value with `REDACTED`; cap recursion depth at 6;
  truncate long strings to 2000 chars with a `"…(+N)"` suffix.
- `redact_headers(headers: dict[str,str]) -> dict[str,str]` — lowercase keys, drop/redact
  `cookie`, `authorization`, `set-cookie`, `x-api-key`; keep useful ones (content-type, user-agent, referer, origin, host, accept).
- `safe_body(raw: bytes, content_type: str | None, cap: int) -> Any` — if empty → None; if
  `application/json` and within cap → `redact(json.loads(...))`; on parse error or non-JSON or
  over cap → a string marker like `f"<{content_type or 'binary'} {len(raw)} bytes>"`.

Keep ≤250 lines. Pure functions, no I/O.

## A3. Writer — `backend/app/services/audit/__init__.py` + `record.py` (NEW)

`record.py`:
```python
import asyncio, logging
logger = logging.getLogger(__name__)
_pending: set[asyncio.Task] = set()

async def record_audit(*, category, action, summary="", outcome="success", source="service",
    method=None, path=None, route=None, status_code=None, duration_ms=None,
    actor_email=None, actor_is_admin=None, ip=None, user_agent=None, request_id=None,
    request_meta=None, response_meta=None, error=None, extra=None) -> None:
    """Persist one audit entry. NEVER raises — audit failures must not break callers."""
    try:
        from ...models import AuditLog          # local import avoids circular import at startup
        doc = AuditLog(category=category, action=action, summary=summary, outcome=outcome,
            source=source, method=method, path=path, route=route, status_code=status_code,
            duration_ms=duration_ms, actor_email=actor_email, actor_is_admin=actor_is_admin,
            ip=ip, user_agent=user_agent, request_id=request_id, request_meta=request_meta,
            response_meta=response_meta, error=error, extra=extra)
        await doc.insert()
    except Exception:  # noqa: BLE001
        logger.exception("audit write failed (action=%s)", action)

def spawn_audit(**kwargs) -> None:
    """Fire-and-forget audit write that does not block the response."""
    try:
        task = asyncio.create_task(record_audit(**kwargs))
        _pending.add(task)
        task.add_done_callback(_pending.discard)
    except RuntimeError:
        # no running loop (e.g. during teardown) — best-effort drop
        logger.debug("spawn_audit skipped: no running event loop")
```
`__init__.py` re-exports `record_audit`, `spawn_audit`.

## A4. Semantic event helpers — `backend/app/services/audit/events.py` (NEW)

Thin awaitable wrappers over `record_audit` for non-HTTP code paths:
```python
async def audit_system_event(action, summary, outcome="success", extra=None): -> record_audit(category="system", source="system", ...)
async def audit_cron_event(action, summary, outcome="success", duration_ms=None, error=None, extra=None): -> category="cron", source="cron"
async def audit_security_event(action, summary, outcome="failure", actor_email=None, ip=None, extra=None): -> category="security", source="service"
async def audit_auth_event(action, summary, outcome="success", actor_email=None, ip=None, extra=None): -> category="auth", source="service"
```
These AWAIT the write (used where we want the write to complete, e.g. startup/shutdown, cron).

## A5. Middleware — `backend/app/middleware/__init__.py` + `audit.py` (NEW package)

Pure ASGI middleware (NOT BaseHTTPMiddleware — avoids body-read deadlocks). Registered as the
OUTERMOST middleware so it sees the final response (incl. error envelopes + CORS/security headers).

Behavior of `class AuditMiddleware`:
```python
class AuditMiddleware:
    def __init__(self, app, settings): self.app = app; self.settings = settings
    async def __call__(self, scope, receive, send):
        if scope["type"] != "http" or not self.settings.audit_enabled:
            return await self.app(scope, receive, send)
        path = scope["path"]; method = scope["method"]
        if method == "OPTIONS" or self._skip(path):
            return await self.app(scope, receive, send)
        # 1) buffer request body (cap) while still forwarding full body downstream
        # 2) wrap send() to capture status + response body (cap)
        # 3) after the response completes, build fields and spawn_audit(...)
```
Implementation notes:
- Request body capture: wrap `receive` so each `http.request` message is forwarded unchanged but
  the first `audit_max_body_bytes` are accumulated for the audit record.
- Response capture: wrap `send`; on `http.response.start` record `status`; on `http.response.body`
  accumulate up to cap, count total bytes; forward everything unchanged.
- Resolve actor: read the `cookie` header from `scope["headers"]`, parse the
  `settings.session_cookie_name` cookie, `decode_session_token(token, settings)` inside try/except
  → `actor_email` (None on failure). Do NOT hit the DB. `actor_is_admin=None` here.
- client IP: `scope.get("client")` → host; honor `x-forwarded-for` first value if present.
- route template: after app runs, `r = scope.get("route"); route = getattr(r, "path", None)`.
- category: derive from path (A0). outcome: from status (A0). action `"http.request"`.
- summary: f"{method} {path} -> {status}".
- request_meta: `{"query": dict(scope query), "headers": redact_headers(...), "body": safe_body(req_body, content_type, cap)}` (only include body when `settings.audit_capture_request_body`).
- response_meta: `{"body": safe_body(resp_body, resp_content_type, cap), "bytes": total}` (only when `settings.audit_capture_response_body`).
- error: when status >= 400, try to parse the response body envelope `{"error": {...}}` → store it.
- duration_ms: `(perf_counter_end - start) * 1000` rounded to 2 dp.
- Persist via `spawn_audit(...)` (fire-and-forget) AFTER the response has been fully sent.
- `_skip(path)`: True if path in `settings.audit_skip_paths` or starts with any of
  `settings.audit_skip_path_prefixes`.

Keep `audit.py` ≤250 lines; factor cookie-parsing into a small local helper.

## A6. Scheduler — `backend/app/core/scheduler.py` (NEW)

APScheduler `AsyncIOScheduler` lifecycle.
```python
from apscheduler.schedulers.asyncio import AsyncIOScheduler
_scheduler: AsyncIOScheduler | None = None
def get_scheduler() -> AsyncIOScheduler | None: return _scheduler
async def start_scheduler() -> None:
    # build AsyncIOScheduler(timezone="UTC"); register jobs from services.cron; start()
    # interval = settings.audit_heartbeat_minutes minutes for the heartbeat job
async def shutdown_scheduler() -> None:
    # if running: shutdown(wait=False)
```
Tolerate APScheduler import/start failures (log, non-fatal) so the app boots without cron.

## A7. Cron jobs — `backend/app/services/cron/__init__.py` + `heartbeat.py` (NEW)

`heartbeat.py`:
```python
import time, functools, logging
from ..audit.events import audit_cron_event

def audited_job(action: str):
    """Decorator: wrap an async job so each run is auto-audited (success+duration / error)."""
    def deco(fn):
        @functools.wraps(fn)
        async def wrapper(*a, **k):
            start = time.perf_counter()
            try:
                result = await fn(*a, **k)
                await audit_cron_event(action, f"cron job {action} completed", outcome="success",
                    duration_ms=round((time.perf_counter()-start)*1000, 2))
                return result
            except Exception as exc:  # noqa: BLE001
                await audit_cron_event(action, f"cron job {action} failed: {exc}", outcome="error",
                    duration_ms=round((time.perf_counter()-start)*1000, 2),
                    error={"code":"CRON_ERROR","message":str(exc)})
                raise
        return wrapper
    return deco

@audited_job("cron.heartbeat")
async def heartbeat_job() -> None:
    """Lightweight liveness job; proves cron auditing works. Counts audit_logs."""
    from ...models import AuditLog
    count = await AuditLog.find().count()
    logging.getLogger(__name__).info("audit heartbeat: %d audit logs", count)
```
`__init__.py` re-exports `heartbeat_job`, `audited_job`. `scheduler.start_scheduler` registers
`heartbeat_job` on an interval trigger.

## A8. Schemas — `backend/app/schemas/audit_log.py` (NEW)

Mirror `backend/app/schemas/admin_user.py` (read it). Extend `PageQuery` from `schemas/common.py`.
```python
AuditSortBy = Literal["timestamp","category","action","outcome","status_code","actor_email","duration_ms","path","method"]
# reuse AuditCategory/AuditOutcome/AuditSource literals (define here too, identical to model)

class AuditLogListQuery(PageQuery):
    sortBy: AuditSortBy = "timestamp"
    # sortOrder inherited (default "desc")
    q: str | None = Field(default=None, max_length=200)
    category: AuditCategory | None = None
    outcome: AuditOutcome | None = None
    method: str | None = Field(default=None, max_length=10)
    actor: str | None = Field(default=None, max_length=200)
    status: int | None = Field(default=None, ge=100, le=599)
    source: AuditSource | None = None
    dateFrom: datetime | None = None
    dateTo: datetime | None = None

class AuditLogPublic(BaseModel):   # list row
    id: str
    timestamp: datetime
    category: str
    action: str
    summary: str
    outcome: str
    source: str
    method: str | None = None
    path: str | None = None
    route: str | None = None
    status_code: int | None = None
    duration_ms: float | None = None
    actor_email: str | None = None
    ip: str | None = None

class AuditLogDetail(AuditLogPublic):  # full view
    actor_is_admin: bool | None = None
    user_agent: str | None = None
    request_id: str | None = None
    request_meta: dict[str, Any] | None = None
    response_meta: dict[str, Any] | None = None
    error: dict[str, Any] | None = None
    extra: dict[str, Any] | None = None

class AuditOptionsQuery(BaseModel):
    q: str | None = Field(default=None, max_length=200)
    limit: int = Field(default=50, ge=1, le=200)

class AsyncOption(BaseModel):   # identical shape to admin_user.AsyncOption
    value: str
    label: str
    sublabel: str | None = None

class AuditFacets(BaseModel):
    categories: list[str]
    outcomes: list[str]
    sources: list[str]
    methods: list[str]
```
If this exceeds ~230 lines, that's fine but keep ≤250; otherwise split DTOs vs query is allowed.

## A9. Query builders — `backend/app/utils/audit_log/__init__.py` + `query.py` (NEW)

Mirror `backend/app/utils/admin_user/query.py`. ALWAYS `re.escape` user input before `$regex`.
```python
def build_audit_filter(query: AuditLogListQuery) -> dict[str, Any]:
    filt = {}
    if query.q:
        rx = {"$regex": re.escape(query.q), "$options": "i"}
        filt["$or"] = [{"path": rx},{"summary": rx},{"action": rx},{"actor_email": rx}]
    if query.category: filt["category"] = query.category
    if query.outcome: filt["outcome"] = query.outcome
    if query.source: filt["source"] = query.source
    if query.method: filt["method"] = query.method.upper()
    if query.status is not None: filt["status_code"] = query.status
    if query.actor: filt["actor_email"] = {"$regex": re.escape(query.actor), "$options": "i"}
    ts = {}
    if query.dateFrom: ts["$gte"] = query.dateFrom
    if query.dateTo: ts["$lte"] = query.dateTo
    if ts: filt["timestamp"] = ts
    return filt

def build_sort(sort_by: str, sort_order: str) -> str:
    return f"{'+' if sort_order == 'asc' else '-'}{sort_by}"
```

## A10. Read services — `backend/app/services/audit_log/__init__.py`, `list.py`, `get.py`, `options.py`, `serialize.py` (NEW)

Mirror `backend/app/services/admin_user/list.py` (read it). `serialize.py`:
- `to_public(doc: AuditLog) -> AuditLogPublic` — `id=str(doc.id)`, copy fields.
- `to_detail(doc: AuditLog) -> AuditLogDetail`.

`list.py`:
```python
async def list_audit_logs(query) -> tuple[list[AuditLogPublic], PaginationMeta]:
    filt = build_audit_filter(query)
    total = await AuditLog.find(filt).count()
    docs = await AuditLog.find(filt).sort(build_sort(query.sortBy, query.sortOrder)).skip(query.skip).limit(query.limit).to_list()
    items = [to_public(d) for d in docs]
    meta = PaginationMeta(page=query.page, limit=query.limit, total=total,
        totalPages=ceil(total/query.limit) if query.limit else 0,
        sortBy=query.sortBy, sortOrder=query.sortOrder)
    return items, meta
```
`get.py`:
```python
async def get_audit_log(log_id: str) -> AuditLogDetail:
    from beanie import PydanticObjectId
    try: oid = PydanticObjectId(log_id)
    except Exception: raise NotFoundError("Audit log not found")
    doc = await AuditLog.get(oid)
    if doc is None: raise NotFoundError("Audit log not found")
    return to_detail(doc)
```
`options.py`:
- `search_audit_options(query: AuditOptionsQuery) -> list[AsyncOption]` — build distinct
  suggestions from recent logs matching `q`: distinct `actor_email` (sublabel "actor"), distinct
  `path` (sublabel "route"), distinct `action` (sublabel "action"); each `AsyncOption(value=X,label=X,sublabel=...)`;
  cap total to `query.limit`. Use `AuditLog.find(...).distinct("actor_email")` etc., or an aggregation;
  guard against None values. `q` filters via `re.escape` regex.
- `get_facets() -> AuditFacets` — categories/outcomes/sources = the literal enums (static lists);
  methods = `await AuditLog.distinct("method")` filtered to non-None, sorted.

## A11. Controller — `backend/app/controllers/audit_log.py` (NEW)

Mirror `backend/app/controllers/admin_user.py` (read it — unknown-key rejection pattern).
```python
_ALLOWED_LIST_KEYS = {"page","limit","sortBy","sortOrder","q","category","outcome","method","actor","status","source","dateFrom","dateTo"}
_ALLOWED_OPTION_KEYS = {"q","limit"}

async def list_audit_logs_controller(request, query: AuditLogListQuery = Depends()) -> SuccessEnvelope[list[AuditLogPublic]]:
    unknown = set(request.query_params.keys()) - _ALLOWED_LIST_KEYS
    if unknown: raise ValidationError(f"Unknown query parameter(s): {', '.join(sorted(unknown))}")
    items, meta = await list_audit_logs(query); return success(items, meta=meta)

async def get_options_controller(request, query: AuditOptionsQuery = Depends()) -> SuccessEnvelope[list[AsyncOption]]:
    unknown = set(request.query_params.keys()) - _ALLOWED_OPTION_KEYS
    if unknown: raise ValidationError(...)
    return success(await search_audit_options(query))

async def get_facets_controller() -> SuccessEnvelope[AuditFacets]:
    return success(await get_facets())

async def get_audit_log_controller(log_id: str) -> SuccessEnvelope[AuditLogDetail]:
    return success(await get_audit_log(log_id))
```

## A12. Routes — `backend/app/routes/audit_log.py` (NEW)

Mirror `backend/app/routes/admin_user.py`. Register `/options` and `/facets` BEFORE `/{log_id}`.
```python
router = APIRouter(prefix="/admin/audit-logs", tags=["admin-audit-logs"], dependencies=[Depends(get_current_admin)])
router.add_api_route("", ctrl.list_audit_logs_controller, methods=["GET"], response_model=SuccessEnvelope[list[AuditLogPublic]], summary="List audit logs (paginated)")
router.add_api_route("/options", ctrl.get_options_controller, methods=["GET"], response_model=SuccessEnvelope[list[AsyncOption]], summary="Async combobox options")
router.add_api_route("/facets", ctrl.get_facets_controller, methods=["GET"], response_model=SuccessEnvelope[AuditFacets], summary="Filter facet enums")
router.add_api_route("/{log_id}", ctrl.get_audit_log_controller, methods=["GET"], response_model=SuccessEnvelope[AuditLogDetail], summary="Get an audit log by id")
```

## A13. INTEGRATION edits (shared existing files — one owner each)

- `backend/app/models/__init__.py`: add `from .audit_log import AuditLog`; `__all__ = ["User", "AuditLog"]`.
- `backend/app/core/database.py`: import `AuditLog`; `DOCUMENT_MODELS = [User, AuditLog]`.
- `backend/app/routes/__init__.py`: `from . import admin_user, audit_log, auth, meta, user`; add `api_router.include_router(audit_log.router)`.
- `backend/app/core/config.py`: add to `Settings`:
  ```python
  audit_enabled: bool = True
  audit_capture_request_body: bool = True
  audit_capture_response_body: bool = True
  audit_max_body_bytes: int = 16384
  audit_skip_paths: tuple[str, ...] = ("/health","/ping","/docs","/openapi.json","/redoc","/favicon.ico","/ws/ping","/")
  audit_skip_path_prefixes: tuple[str, ...] = ("/admin/audit-logs",)
  cron_enabled: bool = True
  audit_heartbeat_minutes: int = 60
  ```
- `backend/app/main.py`:
  - import `AuditMiddleware` from `.middleware.audit`, `start_scheduler`/`shutdown_scheduler` from `.core.scheduler`, `audit_system_event` from `.services.audit.events`.
  - In `lifespan`, after `init_db()`+`seed_admin()` succeed: `if settings.cron_enabled: await start_scheduler()` then `await audit_system_event("system.startup","Application started", extra={"version": __version__})`. (settings available via get_settings()).
  - In the `finally:` block: `try: await audit_system_event("system.shutdown","Application stopping")` then `await shutdown_scheduler()` then `await close_db()` (all guarded).
  - In `create_app()`, AFTER the `_security_headers` decorator and BEFORE `register_exception_handlers(app)`, add: `app.add_middleware(AuditMiddleware, settings=settings)` so it becomes the OUTERMOST middleware (last added = outermost in Starlette).
- `backend/requirements.txt`: add `APScheduler==3.11.0` (verify step will install + re-pin to the resolved version).

## A14. Backend verification (Verify phase)

- `cd backend && ./.venv/bin/pip install APScheduler` (then `./.venv/bin/pip freeze | grep -i apscheduler` to pin exact in requirements.txt).
- `./.venv/bin/python -c "import app.main"` must succeed (no import errors).
- Smoke with `fastapi.testclient.TestClient(app)`: hit `/health` (works without DB), confirm app builds. If Mongo is up, hit `/ping` then `GET /admin/audit-logs` without a session → expect 401 envelope; the middleware must not crash. Confirm an audit doc is written for `/ping` when DB present (best-effort).
- Ensure NO file > 250 lines (`awk` check). Fix any oversize by extracting helpers.

---

# PART B — FRONTEND

All paths under `frontend/src/`. Reference feature to mirror: `components/admin/users/*`,
`pages/admin/users/index.tsx`, `api/admin/users/*`, `types/admin/user*.ts`. Read them.
API client helpers: `getData`, `getList`, `buildQuery` from `api/client.ts`. `AsyncOption` type is
in `types/admin/options.ts`. `PaginationMeta`/`PaginatedResult`/`PageQuery` in `types/api/envelope.ts`.

## B1. Types — `frontend/src/types/admin/audit-log.ts` (NEW)

```ts
import type { PageQuery } from "@/types/api/envelope"

export type AuditCategory = "http" | "auth" | "admin" | "data" | "system" | "cron" | "security"
export type AuditOutcome = "success" | "failure" | "error"
export type AuditSource = "http" | "system" | "cron" | "service"
export type AuditLogSortBy =
  | "timestamp" | "category" | "action" | "outcome"
  | "status_code" | "actor_email" | "duration_ms" | "path" | "method"

export interface AuditLog {
  id: string
  timestamp: string
  category: AuditCategory
  action: string
  summary: string
  outcome: AuditOutcome
  source: AuditSource
  method: string | null
  path: string | null
  route: string | null
  status_code: number | null
  duration_ms: number | null
  actor_email: string | null
  ip: string | null
}

export interface AuditLogDetail extends AuditLog {
  actor_is_admin: boolean | null
  user_agent: string | null
  request_id: string | null
  request_meta: Record<string, unknown> | null
  response_meta: Record<string, unknown> | null
  error: Record<string, unknown> | null
  extra: Record<string, unknown> | null
}

export interface AuditLogListQuery extends PageQuery {
  sortBy?: AuditLogSortBy
  q?: string
  category?: AuditCategory | "all"
  outcome?: AuditOutcome | "all"
  method?: string | "all"
  actor?: string
  status?: number
  source?: AuditSource | "all"
  dateFrom?: string
  dateTo?: string
}

export interface AuditLogFacets {
  categories: AuditCategory[]
  outcomes: AuditOutcome[]
  sources: AuditSource[]
  methods: string[]
}
```

## B2. UI prop contracts — `frontend/src/types/admin/audit-log-ui.ts` (NEW)

Mirror `types/admin/user-ui.ts`. Define prop interfaces:
`AuditLogTableProps`, `AuditLogToolbarProps`, `AuditLogPaginationProps`, `ViewAuditLogSheetProps`,
`AuditCategoryBadgeProps`, `AuditOutcomeBadgeProps`, and the hook return type `AuditLogsState`.
- Toolbar receives `query` (read-only) + `onQueryChange(patch: Partial<AuditLogListQuery>)` + `facets: AuditLogFacets | null`.
- Table receives `rows, isLoading, error, sortBy, sortOrder, onSort(col), onView(id)`.
- Pagination same props as `UserTablePaginationProps` (meta, isLoading, onPageChange, onLimitChange).
- ViewAuditLogSheet receives `open, onOpenChange, detail: AuditLogDetail | null, isLoading`.

## B3. API modules — `frontend/src/api/admin/audit-logs/{list,get,options,facets}.ts` (NEW)

```ts
// list.ts
import { buildQuery, getList } from "@/api/client"
import type { AuditLog, AuditLogListQuery } from "@/types/admin/audit-log"
import type { PaginatedResult } from "@/types/api/envelope"
function normalize(q: AuditLogListQuery): Record<string,string|number|undefined> {
  // drop "all" sentinels → undefined; pass the rest through
  const strip = (v: unknown) => (v === "all" ? undefined : (v as string|number|undefined))
  return { page:q.page, limit:q.limit, sortBy:q.sortBy, sortOrder:q.sortOrder, q:q.q,
    category:strip(q.category), outcome:strip(q.outcome), method:strip(q.method),
    actor:q.actor, status:q.status, source:strip(q.source), dateFrom:q.dateFrom, dateTo:q.dateTo }
}
export function listAuditLogs(query: AuditLogListQuery = {}): Promise<PaginatedResult<AuditLog>> {
  return getList<AuditLog>(`/admin/audit-logs${buildQuery(normalize(query))}`)
}

// get.ts
export function getAuditLog(id: string): Promise<AuditLogDetail> {
  return getData<AuditLogDetail>(`/admin/audit-logs/${id}`)
}

// options.ts  (returns a bare array in data → getData, NOT getList)
import type { AsyncOption } from "@/types/admin/options"
export function searchAuditLogOptions(params: { q?: string; limit?: number } = {}): Promise<AsyncOption[]> {
  return getData<AsyncOption[]>(`/admin/audit-logs/options${buildQuery({ q: params.q, limit: params.limit ?? 50 })}`)
}

// facets.ts
export function getAuditLogFacets(): Promise<AuditLogFacets> {
  return getData<AuditLogFacets>(`/admin/audit-logs/facets`)
}
```

## B4. Hook — `frontend/src/components/admin/audit-logs/hooks/useAuditLogs.ts` (NEW)

Mirror `components/admin/users/hooks/useUserManagement.ts` (read it). Owns:
- `query: AuditLogListQuery` (default `{page:1, limit:20, sortBy:"timestamp", sortOrder:"desc"}`)
- `rows, meta, loading, error` — fetched via `listAuditLogs(query)` in a race-safe effect (`fetchIdRef`).
- `facets` — loaded once on mount via `getAuditLogFacets()` (tolerate failure → null).
- `view` state: `{ open, detail, loading }`; `openView(id)` calls `getAuditLog(id)` (set loading, then detail), `closeView()`.
- Setters: `onQueryChange(patch)` merges patch and resets `page:1` unless patch sets page; `onSort(col)` toggles asc/desc; `onPageChange(page)`, `onLimitChange(limit)` (reset page:1).
- All filter changes reset page to 1. No client-side filtering.
- `toast.error(...)` from `sonner` on fetch failure.

## B5. Table — `frontend/src/components/admin/audit-logs/AuditLogTable.tsx` (NEW)

Mirror `components/admin/users/UserTable.tsx` EXACTLY (SortableHead sub-component, SKELETON_ROWS=8,
loading/error/empty blocks with the same classes). Columns (in order):
1. **Time** (`timestamp`, sortable) — `format(parseISO(iso), "dd MMM HH:mm:ss")` via date-fns, `tabular-nums`.
2. **Category** (`category`, sortable) — `<AuditCategoryBadge category={row.category} />`.
3. **Event** — `summary` (primary `text-sm font-medium text-foreground truncate max-w-[280px]`) with `action` beneath (`text-xs text-muted-foreground`).
4. **Actor** (`actor_email`, sortable) — email or `—` muted when null.
5. **Method · Path** — `<span class="font-mono text-xs">{method}</span> {path}` truncated.
6. **Status** (`status_code`, sortable) — small badge: 2xx emerald, 3xx slate, 4xx amber, 5xx red; `—` when null.
7. **Duration** (`duration_ms`, sortable) — `{n} ms` tabular-nums, muted; `—` when null.
8. **Outcome** (`outcome`, sortable) — `<AuditOutcomeBadge outcome={row.outcome} />`.
9. Actions — a ghost icon button (Eye) → `onView(row.id)`.
Row is clickable to view as well. Use the SAME table classes/skeletons/empty/error markup as UserTable
(swap copy: "No audit logs found", "Failed to load audit logs"). Keep ≤250 lines — if tight, extract
cell renderers into small local functions but keep one file.

## B6. Toolbar — `frontend/src/components/admin/audit-logs/AuditLogToolbar.tsx` (NEW)

Mirror `components/admin/users/UserTableToolbar.tsx`. Layout `flex flex-wrap items-center gap-2`.
Controls (left group `flex flex-1 flex-wrap items-center gap-2`):
- `<div className="w-64 shrink-0">` wrapping `<AsyncCombobox>` bound to `query.q`:
  `value={query.q ?? null} onChange={(v)=>onQueryChange({ q: v ?? undefined })}`,
  `fetchOptions={(q)=>searchAuditLogOptions({ q, limit: 50 })}`, placeholder "Search events…",
  emptyText "No matches.", allowClear, aria-label "Search audit logs".
- Category `<Select>` (`h-9 w-36 shrink-0`): options `["all", ...facets.categories]` (or the static
  category list if facets null), value `query.category ?? "all"`, onValueChange → `onQueryChange({category:v as AuditCategory|"all"})`.
- Outcome `<Select>` (`h-9 w-32`): `["all","success","failure","error"]`.
- Method `<Select>` (`h-9 w-28`): `["all", ...facets.methods]`.
No create button (read-only feature). All changes go through `onQueryChange({...})`. Stateless component.

## B7. Pagination — `frontend/src/components/admin/audit-logs/AuditLogPagination.tsx` (NEW)

Copy `components/admin/users/UserTablePagination.tsx` VERBATIM (rename component → `AuditLogPagination`,
prop type → from `audit-log-ui.ts`). Identical layout/markup/classes (records count, Prev/Page X of N/Next,
rows-per-page Select with [10,20,50]).

## B8. Badges — `frontend/src/components/admin/audit-logs/AuditCategoryBadge.tsx` + `AuditOutcomeBadge.tsx` (NEW)

Mirror `components/admin/users/UserStatusBadge.tsx` pattern (a `const MAP` of `{label, className}` keyed by
value, rendered via shadcn `<Badge variant="outline">`). Use semantic-leaning color triplets
(border/bg/text with dark variants), consistent with the Users status badges:
- Category colors (suggested): http=slate, auth=indigo/primary, admin=violet, data=teal, system=sky, cron=amber, security=red.
- Outcome: success=emerald, failure=amber, error=red.
Provide light+dark classes (e.g. `border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400`). Each badge ≤80 lines.

## B9. View Sheet — `frontend/src/components/admin/audit-logs/ViewAuditLogSheet.tsx` (NEW)

Mirror `components/admin/users/ViewUserSheet.tsx` shell (Sheet side="right", `sm:max-w-lg`, header,
Separator, scrollable body, `DetailRow` grid `grid grid-cols-[7rem_1fr] ...`, section labels
`text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70`). Add shadcn `<Tabs>`
inside the body with tabs: **Details**, **Request**, **Response**, **Raw**.
- Details tab: DetailRows for time, category (badge), action, outcome (badge), source, summary, actor_email,
  actor_is_admin, ip, user_agent, method, path, route, status_code, duration_ms, request_id.
- Request tab: pretty-printed JSON of `detail.request_meta` in
  `<pre className="rounded-md bg-muted/50 p-3 font-mono text-xs text-muted-foreground whitespace-pre-wrap break-all overflow-x-auto">{JSON.stringify(detail.request_meta, null, 2)}</pre>`.
- Response tab: same for `detail.response_meta` (+ `detail.error` if present, in a destructive-tinted block).
- Raw tab: full `JSON.stringify(detail, null, 2)`.
- While `isLoading` show skeleton rows. Use `Tabs` from `components/ui/tabs.tsx`.
Keep ≤250 lines — extract the JSON `<pre>` into a tiny local `JsonBlock` component if needed.

## B10. Page — `frontend/src/pages/admin/audit-logs/index.tsx` (NEW)

Mirror `pages/admin/users/index.tsx` EXACTLY. Export `AuditLogsPage`. Structure:
```tsx
const s = useAuditLogs()
return (
  <div className="flex flex-col gap-5">
    <div className="flex items-start gap-3">
      <span aria-hidden className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <ScrollText className="size-4" />
      </span>
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-foreground">Audit Logs</h2>
        <p className="text-sm text-muted-foreground mt-0.5">System-wide activity across APIs, auth, cron jobs, and server lifecycle.</p>
      </div>
    </div>
    <Separator />
    <AuditLogToolbar query={s.query} facets={s.facets} onQueryChange={s.onQueryChange} />
    <AuditLogTable rows={s.rows} isLoading={s.loading} error={s.error}
      sortBy={s.query.sortBy ?? "timestamp"} sortOrder={s.query.sortOrder ?? "desc"}
      onSort={s.onSort} onView={s.openView} />
    <AuditLogPagination meta={s.meta} isLoading={s.loading} onPageChange={s.onPageChange} onLimitChange={s.onLimitChange} />
    <ViewAuditLogSheet open={s.view.open} onOpenChange={(o)=>!o && s.closeView()} detail={s.view.detail} isLoading={s.view.loading} />
  </div>
)
```
Icon: `ScrollText` from lucide-react. Keep ≤250 lines.

## B11. INTEGRATION edits (shared existing files — one owner each)

- `frontend/src/components/layout/nav-items.ts`: import `ScrollText` from lucide-react; add to
  `ADMIN_NAV_ITEMS`: `{ label: "Audit Logs", to: "/admin/audit-logs", icon: ScrollText }`.
- `frontend/src/App.tsx`: import `{ AuditLogsPage } from "@/pages/admin/audit-logs"`; add inside the
  existing `<Route element={<AdminRoute />}>` block: `<Route path="/admin/audit-logs" element={<AuditLogsPage />} />`.

## B12. Frontend verification (Verify phase)

- `cd frontend && npm run build` (`tsc -b && vite build`) must pass with zero TS errors.
- `npm run lint` must pass (fix warnings introduced by new files).
- Confirm no new file exceeds 250 lines.
- Confirm: no raw hex colors except inside badge color triplets (tailwind color utilities are OK);
  semantic tokens for layout; typed Redux hooks; API only via `api/admin/audit-logs/*`.

---

# Execution notes for agents

- Create parent directories as needed when writing new files.
- Match the existing file's header docstring/comment style and import ordering.
- Do NOT edit any file you don't own. Integration agents own the shared-file edits listed in A13/B11.
- After writing, re-read your file mentally against this SPEC + the reference file. Keep ≤250 lines.
- Return a concise summary of what you created (file paths + 1 line each). Do not paste whole files back.
</content>
</invoke>

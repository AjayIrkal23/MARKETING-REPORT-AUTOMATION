# BE: Controllers / Routes / Audit / Wiring — Implementation Note

> Builder: follow this note verbatim. Zero ambiguity goal. Every snippet is
> derived from the REAL reference files read on 2026-05-31.

---

## 1. Validation findings

### 1.1 SPEC §2 controller / route contract — CONFIRMED CORRECT

The SPEC accurately mirrors the `customer_code` pattern. Key confirmations:

- `get_current_user` and `get_current_admin` are both in
  `app/core/auth_deps.py`. Exact signatures:
  ```python
  async def get_current_user(request: Request) -> AuthUser: ...
  async def get_current_admin(current_user: AuthUser = Depends(get_current_user)) -> AuthUser: ...
  ```
  `get_current_admin` chains `get_current_user` — uses `Depends`, NOT `Request`.
  Both return `AuthUser(emailid, isAdmin, lastlogined)`.

- `customer_code.py` controller uses `_admin: AuthUser = Depends(get_current_admin)` at
  the individual function level, NOT at the router level. The router ALSO declares
  `dependencies=[Depends(get_current_admin)]` — this double-gates the route (harmless but
  intentional belt-and-suspenders). The jsw_stock controllers should follow the same pattern
  but the SPEC says the ROUTER carries the dependency — individual function params are only
  needed when you want the resolved user object (e.g. for `actor_email`). Pick one approach
  consistently (see §3 below).

### 1.2 SPEC frozenset allowed-key list — CONFIRMED CORRECT

List allowed keys from SPEC §2 controllers:
```
page, limit, sortBy, sortOrder, q, dateFrom, dateTo,
so_sales_org, sales_order_type, distr_chnl, sold_to_party, party_code,
ship_to_party, customer, material, sales_office, so_product_form, jsw_grade, nco_declared
```
That is 7 base keys + 12 filter keys = **19 total**. Matches SPEC exactly.

Options allowed keys: `field, q, limit` — 3 keys. Matches SPEC exactly.

### 1.3 AsyncOption import path — CONFIRMED (SPEC says `.schemas.admin_user`)

The real codebase defines `AsyncOption` in `app/schemas/admin_user.py` (line 128).
It is re-exported from `app/schemas/audit_log.py` (as a copy, same shape).
`customer_code.py` imports it via `from .admin_user import AsyncOption`.
The SPEC instruction `"Reuse AsyncOption imported from ...schemas.admin_user"` is CORRECT.
Use `from ...schemas.admin_user import AsyncOption` (three dots from `services/jsw_stock/`).

### 1.4 Audit event category string — CORRECTION NEEDED

SPEC §2 says `category="jsw_stock"` in `audit_jsw_stock_event`.
Compare existing helpers:
- `audit_region_event` uses `category="regions"` (plural)
- `audit_customer_code_event` uses `category="customer_codes"` (plural, not singular)

**The SPEC is inconsistent here.** The `AuditCategory` Literal in BOTH
`models/audit_log.py` and `schemas/audit_log.py` does NOT yet include `"jsw_stock"`.
SPEC §4 wiring step 3+4 says to add `"jsw_stock"` to those Literals. The `_CATEGORIES`
list in `services/audit_log/options.py` also needs it.

**Decision: use `"jsw_stock"` (singular, underscore).** This is what SPEC §4 step 3 adds.
The pattern inconsistency (regions=plural, customer_codes=plural) is a pre-existing quirk —
do NOT change the existing strings. Add `"jsw_stock"` as-is per SPEC §4.

### 1.5 Scheduler — `apply_jsw_stock_schedule` must guard None scheduler

`_scheduler` can be `None` (APScheduler not installed or failed to start). Current
`start_scheduler` returns early without setting `_scheduler` on import failure.
`apply_jsw_stock_schedule` must call `get_scheduler()` and guard `None` before calling
`add_job` / `remove_job`.

### 1.6 `routes/__init__.py` import pattern — CONFIRMED

Current `__init__.py` uses `from . import <module>` then `api_router.include_router(<module>.router)`.
The jsw_stock module exports TWO routers: `router` and `config_router`. Both must be included.

### 1.7 `/options` before `/{id}` ordering — CONFIRMED, NO `/{id}` in jsw_stock

The jsw_stock list router has NO `/{id}` route, so ordering is not a FastAPI collision risk.
Still register `/options` first as a code convention (matches SPEC intent).

---

## 2. Exact file skeletons

### 2.1 `app/controllers/jsw_stock.py`

```python
"""JSW Stock domain controllers (list + options, authenticated users only)."""

from __future__ import annotations

from fastapi import Depends, Request

from ..core.auth_deps import get_current_user
from ..core.errors import ValidationError
from ..core.responses import SuccessEnvelope, success
from ..schemas.auth import AuthUser
from ..schemas.jsw_stock import JswStockListQuery, JswStockOptionsQuery
from ..schemas.jsw_stock_record import JswStockPublic
from ..schemas.admin_user import AsyncOption
from ..services.jsw_stock.list import list_jsw_stock
from ..services.jsw_stock.options import search_field_options

_ALLOWED_LIST_KEYS = frozenset({
    "page", "limit", "sortBy", "sortOrder", "q", "dateFrom", "dateTo",
    "so_sales_org", "sales_order_type", "distr_chnl", "sold_to_party",
    "party_code", "ship_to_party", "customer", "material", "sales_office",
    "so_product_form", "jsw_grade", "nco_declared",
})

_ALLOWED_OPTION_KEYS = frozenset({"field", "q", "limit"})


async def list_jsw_stock_controller(
    request: Request,
    query: JswStockListQuery = Depends(),
    _user: AuthUser = Depends(get_current_user),
) -> SuccessEnvelope[list[JswStockPublic]]:
    """GET /jsw-stock — paginated, sorted, filtered JSW stock list."""
    unknown = set(request.query_params.keys()) - _ALLOWED_LIST_KEYS
    if unknown:
        raise ValidationError(
            f"Unknown query parameter(s): {', '.join(sorted(unknown))}"
        )
    items, meta = await list_jsw_stock(query)
    return success(items, meta=meta)


async def field_options_controller(
    request: Request,
    query: JswStockOptionsQuery = Depends(),
    _user: AuthUser = Depends(get_current_user),
) -> SuccessEnvelope[list[AsyncOption]]:
    """GET /jsw-stock/options — async-combobox field options (<=20)."""
    unknown = set(request.query_params.keys()) - _ALLOWED_OPTION_KEYS
    if unknown:
        raise ValidationError(
            f"Unknown query parameter(s): {', '.join(sorted(unknown))}"
        )
    options = await search_field_options(query)
    return success(options)
```

**Line count: ~45. Well under 250.**

### 2.2 `app/controllers/jsw_stock_config.py`

```python
"""JSW Stock config controllers (admin-only: config get/put, status, run-now)."""

from __future__ import annotations

from fastapi import Depends

from ..core.auth_deps import get_current_admin
from ..core.responses import SuccessEnvelope, success
from ..schemas.auth import AuthUser
from ..schemas.jsw_stock_config import (
    JswStockConfigPublic,
    JswStockConfigUpdate,
    JswStockStatusPublic,
)
from ..services.jsw_stock.config_service import get_config, upsert_config
from ..services.jsw_stock.poller import run_poll
from ..services.jsw_stock.status import get_status


async def get_config_controller(
    _admin: AuthUser = Depends(get_current_admin),
) -> SuccessEnvelope[JswStockConfigPublic]:
    """GET /admin/jsw-stock/config — retrieve current config."""
    return success(await get_config())


async def update_config_controller(
    body: JswStockConfigUpdate,
    admin: AuthUser = Depends(get_current_admin),
) -> SuccessEnvelope[JswStockConfigPublic]:
    """PUT /admin/jsw-stock/config — update config and reschedule job."""
    result = await upsert_config(body, actor_email=admin.emailid)
    return success(result, message="Configuration saved")


async def get_status_controller(
    _admin: AuthUser = Depends(get_current_admin),
) -> SuccessEnvelope[JswStockStatusPublic]:
    """GET /admin/jsw-stock/status — ingestion status + recent runs."""
    return success(await get_status())


async def run_now_controller(
    _admin: AuthUser = Depends(get_current_admin),
) -> SuccessEnvelope[JswStockStatusPublic]:
    """POST /admin/jsw-stock/run-now — trigger an immediate poll."""
    await run_poll()
    return success(await get_status(), message="Poll triggered")
```

**Line count: ~45. Well under 250.**

### 2.3 `app/routes/jsw_stock.py`

```python
"""JSW Stock routes — TWO routers exported from this module.

router:        prefix /jsw-stock        — authenticated users (get_current_user)
config_router: prefix /admin/jsw-stock  — admin only (get_current_admin)

Registration order: /options before any variable segment (none here, but follow
the convention). Config literals (/config, /status, /run-now) have no collision
risk — all are literal strings.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends

from ..controllers import jsw_stock as ctrl
from ..controllers import jsw_stock_config as cfg_ctrl
from ..core.auth_deps import get_current_admin, get_current_user
from ..core.responses import SuccessEnvelope
from ..schemas.admin_user import AsyncOption
from ..schemas.jsw_stock_config import JswStockConfigPublic, JswStockStatusPublic
from ..schemas.jsw_stock_record import JswStockPublic

# ---------------------------------------------------------------------------
# Public (authenticated) router
# ---------------------------------------------------------------------------

router = APIRouter(
    prefix="/jsw-stock",
    tags=["jsw-stock"],
    dependencies=[Depends(get_current_user)],
)

router.add_api_route(
    "",
    ctrl.list_jsw_stock_controller,
    methods=["GET"],
    response_model=SuccessEnvelope[list[JswStockPublic]],
    summary="List JSW stock rows (paginated)",
)

router.add_api_route(
    "/options",
    ctrl.field_options_controller,
    methods=["GET"],
    response_model=SuccessEnvelope[list[AsyncOption]],
    summary="Async combobox field options for JSW stock filters",
)

# ---------------------------------------------------------------------------
# Admin config router
# ---------------------------------------------------------------------------

config_router = APIRouter(
    prefix="/admin/jsw-stock",
    tags=["admin-jsw-stock"],
    dependencies=[Depends(get_current_admin)],
)

config_router.add_api_route(
    "/config",
    cfg_ctrl.get_config_controller,
    methods=["GET"],
    response_model=SuccessEnvelope[JswStockConfigPublic],
    summary="Get JSW stock excel config",
)

config_router.add_api_route(
    "/config",
    cfg_ctrl.update_config_controller,
    methods=["PUT"],
    response_model=SuccessEnvelope[JswStockConfigPublic],
    summary="Update JSW stock excel config",
)

config_router.add_api_route(
    "/status",
    cfg_ctrl.get_status_controller,
    methods=["GET"],
    response_model=SuccessEnvelope[JswStockStatusPublic],
    summary="Get JSW stock ingestion status",
)

config_router.add_api_route(
    "/run-now",
    cfg_ctrl.run_now_controller,
    methods=["POST"],
    response_model=SuccessEnvelope[JswStockStatusPublic],
    summary="Trigger an immediate JSW stock poll",
)
```

**Line count: ~75. Well under 250.**

### 2.4 `app/services/jsw_stock/options.py` (AsyncOption import)

```python
"""JSW Stock service: async combobox field-options search."""

from __future__ import annotations

import re
from typing import Any

from ...models.jsw_stock import JswStock
from ...schemas.admin_user import AsyncOption
from ...schemas.jsw_stock import JswStockOptionsQuery


async def search_field_options(query: JswStockOptionsQuery) -> list[AsyncOption]:
    filt: dict[str, Any] = {}
    if query.q:
        filt[query.field] = {"$regex": re.escape(query.q), "$options": "i"}

    # Beanie 2.x: filter is 2nd positional arg (NOT keyword 'filter=')
    values: list[Any] = await JswStock.distinct(query.field, filt)

    results: list[AsyncOption] = []
    for v in values:
        if v is None:
            continue
        s = str(v).strip()
        if not s:
            continue
        results.append(AsyncOption(value=s, label=s))

    results.sort(key=lambda o: o.label.lower())
    return results[: query.limit]
```

---

## 3. Exact wiring edits for the 8 shared backend files

Apply these in order. Each shows the EXACT old string → new string.

### Edit 1: `app/models/__init__.py`

**Old:**
```python
from .audit_log import AuditLog
from .customer_code import CustomerCode
from .region import Region
from .user import User

__all__ = ["AuditLog", "CustomerCode", "Region", "User"]
```

**New:**
```python
from .audit_log import AuditLog
from .customer_code import CustomerCode
from .jsw_stock import JswStock
from .jsw_stock_config import JswStockConfig
from .jsw_stock_ingestion import JswStockIngestion
from .region import Region
from .user import User

__all__ = ["AuditLog", "CustomerCode", "JswStock", "JswStockConfig", "JswStockIngestion", "Region", "User"]
```

### Edit 2: `app/core/database.py`

**Old (import line):**
```python
from ..models import AuditLog, CustomerCode, Region, User
```

**New:**
```python
from ..models import AuditLog, CustomerCode, JswStock, JswStockConfig, JswStockIngestion, Region, User
```

**Old (DOCUMENT_MODELS line):**
```python
DOCUMENT_MODELS = [User, AuditLog, CustomerCode, Region]
```

**New:**
```python
DOCUMENT_MODELS = [User, AuditLog, CustomerCode, Region, JswStock, JswStockConfig, JswStockIngestion]
```

### Edit 3: `app/models/audit_log.py`

**Old:**
```python
AuditCategory = Literal["http", "auth", "admin", "data", "system", "cron", "security", "regions", "customer_codes"]
```

**New:**
```python
AuditCategory = Literal["http", "auth", "admin", "data", "system", "cron", "security", "regions", "customer_codes", "jsw_stock"]
```

### Edit 4: `app/schemas/audit_log.py`

**Old:**
```python
AuditCategory = Literal["http", "auth", "admin", "data", "system", "cron", "security", "regions", "customer_codes"]
```

**New:**
```python
AuditCategory = Literal["http", "auth", "admin", "data", "system", "cron", "security", "regions", "customer_codes", "jsw_stock"]
```

### Edit 5: `app/services/audit_log/options.py`

**Old:**
```python
_CATEGORIES: list[str] = ["http", "auth", "admin", "data", "system", "cron", "security", "regions", "customer_codes"]
```

**New:**
```python
_CATEGORIES: list[str] = ["http", "auth", "admin", "data", "system", "cron", "security", "regions", "customer_codes", "jsw_stock"]
```

### Edit 6: `app/services/audit/events.py`

Append at end of file (after `audit_customer_code_event`):

```python
async def audit_jsw_stock_event(
    action: str,
    summary: str,
    outcome: str = "success",
    actor_email: str | None = None,
    extra: dict[str, Any] | None = None,
) -> None:
    """Record a JSW stock event (ingested, failed, missing_alert, config_updated).

    Args:
        action:      Dot-namespaced identifier, e.g. ``"jsw_stock.ingested"``.
        summary:     Human-readable description.
        outcome:     ``"success"`` | ``"failure"`` | ``"error"``; defaults to ``"success"``.
        actor_email: Actor email for config mutations; ``None`` for cron-originated events.
        extra:       Arbitrary extra context (report_date, row_count, file_path, etc.).
    """
    await record_audit(
        category="jsw_stock",
        action=action,
        summary=summary,
        outcome=outcome,
        source="service",
        actor_email=actor_email,
        extra=extra,
    )
```

### Edit 7: `app/core/scheduler.py`

Two additions to this file.

**A) Add `apply_jsw_stock_schedule` function (append after `shutdown_scheduler`):**

```python
async def apply_jsw_stock_schedule() -> None:
    """Add or remove the JSW stock poll job based on current config.

    Called by ``config_service.upsert_config`` whenever the config is saved.
    Tolerates a ``None`` or not-yet-started scheduler (no-op with warning).
    """
    sched = get_scheduler()
    if sched is None:
        logger.warning("apply_jsw_stock_schedule: scheduler not running — skipped.")
        return

    try:
        from apscheduler.triggers.interval import IntervalTrigger  # noqa: PLC0415
        from ..services.jsw_stock.config_service import get_config  # noqa: PLC0415
        from ..services.cron.jsw_stock import jsw_stock_poll_job  # noqa: PLC0415

        cfg = await get_config()

        if cfg.enabled:
            sched.add_job(
                jsw_stock_poll_job,
                trigger=IntervalTrigger(hours=cfg.interval_hours),
                id="jsw_stock.poll",
                name="JSW Stock poll",
                replace_existing=True,
                next_run_time=__import__("datetime").datetime.now(),
                misfire_grace_time=60,
            )
            logger.info(
                "JSW stock poll job scheduled — every %d hour(s).",
                cfg.interval_hours,
            )
        else:
            try:
                sched.remove_job("jsw_stock.poll")
                logger.info("JSW stock poll job removed (disabled).")
            except Exception:  # noqa: BLE001
                pass  # job may not exist yet — ignore
    except Exception:  # noqa: BLE001
        logger.warning("apply_jsw_stock_schedule failed.", exc_info=True)
```

**B) In `start_scheduler`, add jsw_stock job registration AFTER the heartbeat job and BEFORE `sched.start()`:**

Insert after the `sched.add_job(heartbeat_job, ...)` block:

```python
        # Register JSW stock poll job if enabled at startup.
        try:
            from ..services.jsw_stock.config_service import get_config as _get_jsw_cfg  # noqa: PLC0415
            from ..services.cron.jsw_stock import jsw_stock_poll_job  # noqa: PLC0415

            jsw_cfg = await _get_jsw_cfg()
            if jsw_cfg.enabled:
                sched.add_job(
                    jsw_stock_poll_job,
                    trigger=IntervalTrigger(hours=jsw_cfg.interval_hours),
                    id="jsw_stock.poll",
                    name="JSW Stock poll",
                    replace_existing=True,
                    misfire_grace_time=60,
                )
        except Exception:  # noqa: BLE001
            logger.warning("JSW stock job registration skipped (config not yet available).", exc_info=True)
```

> **Note:** `start_scheduler` is currently NOT `async` — it is a plain `async def` that
> calls `await`-able things inside `try/except`. Confirm the function signature — it IS
> already declared `async def start_scheduler()`. The `await _get_jsw_cfg()` call is safe.

### Edit 8: `app/routes/__init__.py`

**Old:**
```python
from . import admin_user, audit_log, auth, customer_code, meta, region, user

api_router = APIRouter()
api_router.include_router(meta.router)
api_router.include_router(auth.router)
api_router.include_router(user.router)
api_router.include_router(admin_user.router)
api_router.include_router(audit_log.router)
api_router.include_router(region.router)
api_router.include_router(customer_code.router)
```

**New:**
```python
from . import admin_user, audit_log, auth, customer_code, jsw_stock, meta, region, user

api_router = APIRouter()
api_router.include_router(meta.router)
api_router.include_router(auth.router)
api_router.include_router(user.router)
api_router.include_router(admin_user.router)
api_router.include_router(audit_log.router)
api_router.include_router(region.router)
api_router.include_router(customer_code.router)
api_router.include_router(jsw_stock.router)
api_router.include_router(jsw_stock.config_router)
```

---

## 4. Cron module skeleton

### `app/services/cron/jsw_stock.py`

```python
"""Cron job: JSW stock file poll."""

from __future__ import annotations

from .heartbeat import audited_job  # defined in services/cron/heartbeat.py line 31


@audited_job("cron.jsw_stock_poll")
async def jsw_stock_poll_job() -> None:
    """APScheduler job — polls for new JSW stock Excel and ingests if found."""
    from ...services.jsw_stock.poller import run_poll  # local import avoids cycles
    await run_poll()
```

`audited_job` is confirmed at `services/cron/heartbeat.py:31` — no ambiguity.

---

## 5. Auth gating pattern — clarification

The SPEC says the ROUTER carries `dependencies=[Depends(get_current_user)]`. The controller
functions ALSO redeclare `_user: AuthUser = Depends(get_current_user)` in the skeletons
above. This mirrors the `customer_code` reference implementation precisely:

- Router-level: ensures OpenAPI shows auth requirement; blocks at Starlette routing layer.
- Controller-level: provides the resolved `AuthUser` object for `actor_email` threading.

For `jsw_stock.py` list/options controllers: the user object is not needed for `actor_email`
(read-only endpoints). You MAY omit the controller-level `Depends` and rely on router-level
only — but the reference keeps it for consistency. Either is correct.

For `jsw_stock_config.py`: `update_config_controller` NEEDS `admin.emailid` for audit
threading — keep the controller-level `Depends(get_current_admin)`.

---

## 6. Line-count risk assessment

| File | Estimated lines | Risk |
|------|-----------------|------|
| `controllers/jsw_stock.py` | ~45 | Safe |
| `controllers/jsw_stock_config.py` | ~45 | Safe |
| `routes/jsw_stock.py` | ~75 | Safe |
| `services/jsw_stock/options.py` | ~40 | Safe |
| `core/scheduler.py` after edits | ~140 | Safe (was ~100) |
| `services/audit/events.py` after append | ~215 | Safe (was ~195) |

---

## 7. Verification commands

After applying all wiring edits and creating new domain files:

```bash
cd /DATA/CODE_FILES/MARKETING\ REPORT\ AUTOMATION/backend
./.venv/bin/python -c "import app.main; print('imports OK')"

# Routes present:
./.venv/bin/python -c "
from app.main import app
routes = [r.path for r in app.routes]
assert '/jsw-stock' in routes, 'missing /jsw-stock'
assert '/jsw-stock/options' in routes, 'missing /jsw-stock/options'
assert '/admin/jsw-stock/config' in routes, 'missing /admin/jsw-stock/config'
assert '/admin/jsw-stock/status' in routes, 'missing /admin/jsw-stock/status'
assert '/admin/jsw-stock/run-now' in routes, 'missing /admin/jsw-stock/run-now'
print('all routes present')
"
```

---

## 8. Corrections to surface to orchestrator

1. **Audit category name confirmed as `"jsw_stock"`** (singular, underscore). SPEC §2 and
   §4 are internally consistent. The pre-existing inconsistency in other domains
   (regions=plural) does not affect the new domain — use `"jsw_stock"` as specified.

2. **`start_scheduler` IS async** — confirmed in the real file. The added `await _get_jsw_cfg()` call
   inside the try/except block is valid.

3. **`audited_job` decorator** — confirmed at `services/cron/heartbeat.py:31`. Import with
   `from .heartbeat import audited_job` inside `services/cron/jsw_stock.py`.

# BE Controller + Routes — JVML Stock (builder-ready packet)

> READ-ONLY research output. Do NOT modify source files listed under
> "Reference files read". NEVER touch any jsw_stock / jsw-stock / JswStock file.

---

## 1. Confirmed controller signature style

From `backend/app/controllers/customer_code.py` (the canonical reference):

- Every controller is a **plain `async def` function** — NOT a class method.
- The function receives FastAPI `Depends()` injections as keyword args, NOT a raw `Request` alone.
- **`request: Request`** is the FIRST positional parameter on list/options endpoints — needed to read `request.query_params.keys()` for the unknown-key frozenset check.
- Auth dep is injected as a `_user: AuthUser = Depends(get_current_user)` or `_admin: AuthUser = Depends(get_current_admin)` argument (underscore prefix = intentionally unused beyond dep resolution, UNLESS the function needs `actor_email`).
- For mutation controllers that need actor identity (audit trail), the dep variable is named `admin: AuthUser = Depends(get_current_admin)` (no underscore) and `admin.emailid` is threaded to the service call.
- Query is parsed via `query: XxxListQuery = Depends()` — Pydantic parses query params automatically via FastAPI Depends.
- Return type annotation is `SuccessEnvelope[...]` — the actual return value is a `success(data, meta=...)` call.
- `meta` for list endpoints is passed as a **keyword arg**: `success(items, meta=meta)` where `meta` is a `PaginationMeta`. It is NOT wrapped in `{"pagination": meta.model_dump()}` — the `success()` helper sets `meta` directly on the envelope.

**SPEC MISMATCH #1 — `meta` shape:**
SPEC §2 says `return success(rows, meta={"pagination": meta.model_dump()})`. The real
`success()` signature is `success(data, message="", meta: PaginationMeta | None = None)`.
The `meta` field on `SuccessEnvelope` is typed `PaginationMeta | None` — passing a raw
`dict` would fail Pydantic validation. The correct call is `success(items, meta=meta)`
(pass the `PaginationMeta` object directly), matching the exact pattern in
`services/customer_code/list.py` → `controllers/customer_code.py`.

---

## 2. Frozenset unknown-key rejection — exact pattern

```python
_ALLOWED_LIST_KEYS = frozenset({
    "page", "limit", "sortBy", "sortOrder", "q",
    "dateFrom", "dateTo",
    # 10 per-field filters (JvmlStockField literals):
    "so_sales_org", "sales_order_type", "distr_chnl", "sold_to_party",
    "customer", "material", "sales_office", "so_product_form",
    "jsw_grade", "nco_declared",
})

_ALLOWED_OPTION_KEYS = frozenset({"field", "q", "limit"})
```

Check pattern (same in both list and options controllers):
```python
unknown = set(request.query_params.keys()) - _ALLOWED_LIST_KEYS
if unknown:
    raise ValidationError(
        f"Unknown query parameter(s): {', '.join(sorted(unknown))}"
    )
```

`ValidationError` is imported from `..core.errors` — it maps to HTTP 400.

---

## 3. Import paths (all verified from reference files)

```python
from __future__ import annotations

# Core
from ..core.auth_deps import get_current_admin, get_current_user
from ..core.errors import ValidationError
from ..core.responses import SuccessEnvelope, success, PaginationMeta

# Schemas
from ..schemas.auth import AuthUser
from ..schemas.admin_user import AsyncOption          # used in options controller
from ..schemas.jvml_stock import (
    JvmlStockListQuery,
    JvmlStockOptionsQuery,
)
from ..schemas.jvml_stock_record import JvmlStockPublic
from ..schemas.jvml_stock_config import (
    JvmlStockConfigPublic,
    JvmlStockConfigUpdate,
    JvmlStockStatusPublic,
)

# Services (jvml_stock.py controller)
from ..services.jvml_stock.list import list_jvml_stock
from ..services.jvml_stock.options import search_field_options

# Services (jvml_stock_config.py controller)
from ..services.jvml_stock.config_service import get_config, upsert_config
from ..services.jvml_stock.status import get_status
from ..services.jvml_stock.poller import run_poll

# FastAPI
from fastapi import Depends, Request
```

---

## 4. Ready-to-paste: `app/controllers/jvml_stock.py`

```python
"""JVML Stock read controllers (thin: call service, wrap in envelope).

Gated by get_current_user (NOT admin) — all authenticated users may access
the list and options endpoints.

Unknown query-param rejection mirrors controllers/customer_code.py.
"""

from __future__ import annotations

from fastapi import Depends, Request

from ..core.auth_deps import get_current_user
from ..core.errors import ValidationError
from ..core.responses import SuccessEnvelope, success
from ..schemas.admin_user import AsyncOption
from ..schemas.auth import AuthUser
from ..schemas.jvml_stock import JvmlStockListQuery, JvmlStockOptionsQuery
from ..schemas.jvml_stock_record import JvmlStockPublic
from ..services.jvml_stock.list import list_jvml_stock
from ..services.jvml_stock.options import search_field_options

# ---------------------------------------------------------------------------
# Whitelists for unknown-key rejection (backend-api-standards, OWASP A04).
# ---------------------------------------------------------------------------

_ALLOWED_LIST_KEYS = frozenset({
    "page", "limit", "sortBy", "sortOrder", "q",
    "dateFrom", "dateTo",
    # 10 JvmlStockField filters (exact snake_case keys):
    "so_sales_org", "sales_order_type", "distr_chnl", "sold_to_party",
    "customer", "material", "sales_office", "so_product_form",
    "jsw_grade", "nco_declared",
})

_ALLOWED_OPTION_KEYS = frozenset({"field", "q", "limit"})


# ---------------------------------------------------------------------------
# Controllers
# ---------------------------------------------------------------------------


async def list_jvml_stock_controller(
    request: Request,
    query: JvmlStockListQuery = Depends(),
    _user: AuthUser = Depends(get_current_user),
) -> SuccessEnvelope[list[JvmlStockPublic]]:
    """GET /jvml-stock — paginated, sorted, filtered JVML stock list."""
    unknown = set(request.query_params.keys()) - _ALLOWED_LIST_KEYS
    if unknown:
        raise ValidationError(
            f"Unknown query parameter(s): {', '.join(sorted(unknown))}"
        )
    items, meta = await list_jvml_stock(query)
    return success(items, meta=meta)


async def field_options_controller(
    request: Request,
    query: JvmlStockOptionsQuery = Depends(),
    _user: AuthUser = Depends(get_current_user),
) -> SuccessEnvelope[list[AsyncOption]]:
    """GET /jvml-stock/options — async-combobox field options (<=50)."""
    unknown = set(request.query_params.keys()) - _ALLOWED_OPTION_KEYS
    if unknown:
        raise ValidationError(
            f"Unknown query parameter(s): {', '.join(sorted(unknown))}"
        )
    options = await search_field_options(query)
    return success(options)
```

Lines: ~64. Well under 250.

---

## 5. Ready-to-paste: `app/controllers/jvml_stock_config.py`

```python
"""JVML Stock config + admin controllers.

All endpoints gated by get_current_admin.
update_config_controller threads current_admin.emailid to the service
(audit trail via actor_email).
"""

from __future__ import annotations

from fastapi import Depends

from ..core.auth_deps import get_current_admin
from ..core.responses import SuccessEnvelope, success
from ..schemas.auth import AuthUser
from ..schemas.jvml_stock_config import (
    JvmlStockConfigPublic,
    JvmlStockConfigUpdate,
    JvmlStockStatusPublic,
)
from ..services.jvml_stock.config_service import get_config, upsert_config
from ..services.jvml_stock.poller import run_poll
from ..services.jvml_stock.status import get_status


async def get_config_controller(
    _admin: AuthUser = Depends(get_current_admin),
) -> SuccessEnvelope[JvmlStockConfigPublic]:
    """GET /admin/jvml-stock/config — retrieve singleton config."""
    return success(await get_config())


async def update_config_controller(
    body: JvmlStockConfigUpdate,
    current_admin: AuthUser = Depends(get_current_admin),
) -> SuccessEnvelope[JvmlStockConfigPublic]:
    """PUT /admin/jvml-stock/config — upsert singleton config + reschedule."""
    result = await upsert_config(body, actor_email=current_admin.emailid)
    return success(result, message="Configuration saved")


async def get_status_controller(
    _admin: AuthUser = Depends(get_current_admin),
) -> SuccessEnvelope[JvmlStockStatusPublic]:
    """GET /admin/jvml-stock/status — ingestion status + recent runs."""
    return success(await get_status())


async def run_now_controller(
    _admin: AuthUser = Depends(get_current_admin),
) -> SuccessEnvelope[JvmlStockStatusPublic]:
    """POST /admin/jvml-stock/run-now — trigger poll immediately."""
    status = await run_poll()
    return success(status, message="Poll triggered")
```

Lines: ~53. Well under 250.

Note on `current_admin.emailid` (SPEC §2, controllers section): `AuthUser.emailid` is the
field name (confirmed in `schemas/auth.py` — `emailid: EmailStr`). The SPEC says "threads
.emailid" — confirmed correct.

---

## 6. Ready-to-paste: `app/routes/jvml_stock.py`

```python
"""JVML Stock routes — two routers in one module.

router        prefix=/jvml-stock         gate=get_current_user  (all auth users)
config_router prefix=/admin/jvml-stock   gate=get_current_admin (admin only)

Registration order rule (mirror customer_code.py):
  /options MUST be registered before any /{id} path param route (none here,
  but keep literal routes first as a guard for future additions).

Both routers are exported. The ORCHESTRATOR includes both in routes/__init__.py.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends

from ..controllers import jvml_stock as ctrl
from ..controllers import jvml_stock_config as cfg_ctrl
from ..core.auth_deps import get_current_admin, get_current_user
from ..core.responses import SuccessEnvelope
from ..schemas.admin_user import AsyncOption
from ..schemas.jvml_stock_record import JvmlStockPublic
from ..schemas.jvml_stock_config import (
    JvmlStockConfigPublic,
    JvmlStockStatusPublic,
)

# ---------------------------------------------------------------------------
# Public (authenticated) router
# ---------------------------------------------------------------------------

router = APIRouter(
    prefix="/jvml-stock",
    tags=["jvml-stock"],
    dependencies=[Depends(get_current_user)],
)

# /options MUST come before any /{id} route (registration-order guard).
router.add_api_route(
    "",
    ctrl.list_jvml_stock_controller,
    methods=["GET"],
    response_model=SuccessEnvelope[list[JvmlStockPublic]],
    summary="List JVML stock (paginated)",
)

router.add_api_route(
    "/options",
    ctrl.field_options_controller,
    methods=["GET"],
    response_model=SuccessEnvelope[list[AsyncOption]],
    summary="Async combobox field options",
)

# ---------------------------------------------------------------------------
# Admin config router
# ---------------------------------------------------------------------------

config_router = APIRouter(
    prefix="/admin/jvml-stock",
    tags=["jvml-stock-admin"],
    dependencies=[Depends(get_current_admin)],
)

config_router.add_api_route(
    "/config",
    cfg_ctrl.get_config_controller,
    methods=["GET"],
    response_model=SuccessEnvelope[JvmlStockConfigPublic],
    summary="Get JVML stock config",
)

config_router.add_api_route(
    "/config",
    cfg_ctrl.update_config_controller,
    methods=["PUT"],
    response_model=SuccessEnvelope[JvmlStockConfigPublic],
    summary="Update JVML stock config",
)

config_router.add_api_route(
    "/status",
    cfg_ctrl.get_status_controller,
    methods=["GET"],
    response_model=SuccessEnvelope[JvmlStockStatusPublic],
    summary="Get JVML stock ingestion status",
)

config_router.add_api_route(
    "/run-now",
    cfg_ctrl.run_now_controller,
    methods=["POST"],
    response_model=SuccessEnvelope[JvmlStockStatusPublic],
    summary="Trigger JVML stock poll immediately",
)
```

Lines: ~74. Well under 250.

---

## 7. ORCHESTRATOR wiring snippet (routes/__init__.py append)

```python
# Append to routes/__init__.py (ORCHESTRATOR only — re-read file first):
from . import jvml_stock
api_router.include_router(jvml_stock.router)
api_router.include_router(jvml_stock.config_router)
```

---

## 8. /options-before-/{id} registration order — confirmed

From `routes/customer_code.py` comments (lines 6-9, 63-64):

> "IMPORTANT: Literal-segment routes (/options, /template, /import) are registered
> BEFORE /{code_id} so FastAPI does not absorb those literal strings as an id path
> parameter. Route registration order is significant in Starlette/FastAPI."

For `jvml_stock.py` there is no `/{id}` route in the current SPEC scope (list and options only), but the pattern is maintained anyway: `GET ""` first, then `GET /options`. This preserves the literal-before-param order as an explicit guard if a detail endpoint is added later.

---

## 9. SPEC mismatches and clarifications

| # | Location | SPEC says | Reality | Action |
|---|---|---|---|---|
| 1 | §2 controllers note | `success(rows, meta={"pagination": meta.model_dump()})` | `success()` signature: `meta: PaginationMeta \| None` — pass object directly, not a dict | Use `success(items, meta=meta)` — passing a dict breaks Pydantic validation |
| 2 | §2 controllers note | "both gated by `get_current_user` (NOT admin)" | Confirmed correct — `_user: AuthUser = Depends(get_current_user)` in both list and options | No change needed |
| 3 | §2 routes note | `response_model=SuccessEnvelope[...]` on both routers | Confirmed pattern — customer_code.py uses `response_model=SuccessEnvelope[list[CustomerCodePublic]]` on each `add_api_route` call | No change needed |
| 4 | §2 config controller | "update binds current_admin: AuthUser, threads .emailid" | `AuthUser.emailid` confirmed in `schemas/auth.py` | Use `current_admin.emailid` as `actor_email` kwarg |
| 5 | §2 routes note | Both routers in one module (`routes/jvml_stock.py`) | Pattern differs from customer_code (which has one router per file) — this is intentional for JVML Stock per SPEC | Implement as specified (two routers, one file) |

---

## 10. Key type facts for builder

- `AsyncOption` lives in `app.schemas.admin_user` (NOT a separate file). Import: `from ..schemas.admin_user import AsyncOption`.
- `PaginationMeta` lives in `app.core.responses`. Import: `from ..core.responses import PaginationMeta` (needed in service layer, not controllers).
- `AuthUser.emailid` is `EmailStr` — always lowercase/normalized. Safe to pass as `actor_email`.
- `PageQuery` lives in `app.schemas.common`. `JvmlStockListQuery(PageQuery)` extends it.
- `SuccessEnvelope` and `success()` both live in `app.core.responses`.
- `ValidationError` (400) lives in `app.core.errors`.
- `get_current_user` and `get_current_admin` both live in `app.core.auth_deps`.

---

## 11. File line-count estimates

| File | Estimated lines | Under 250? |
|---|---|---|
| `controllers/jvml_stock.py` | ~64 | Yes |
| `controllers/jvml_stock_config.py` | ~53 | Yes |
| `routes/jvml_stock.py` | ~74 | Yes |

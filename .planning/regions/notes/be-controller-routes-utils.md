# Backend Controller + Routes + Utils — Region Domain
## Implementation Notes for Coding Agent

Source files read: `controllers/audit_log.py`, `controllers/admin_user.py`,
`routes/audit_log.py`, `routes/admin_user.py`, `routes/__init__.py`,
`utils/audit_log/query.py`, `utils/admin_user/query.py`, `utils/user/query.py`,
`core/auth_deps.py`, `core/responses.py`, `core/errors.py`.

---

## 1. `backend/app/utils/region/query.py` (NEW)

Create the directory first: `backend/app/utils/region/__init__.py` (empty, 1 line) + `query.py`.

### Exact function signatures

```python
"""Query helpers for the region domain (filter + sort building)."""

from __future__ import annotations

import re
from typing import Any

from ...schemas.region import RegionListQuery


def build_region_filter(query: RegionListQuery) -> dict[str, Any]:
    filt: dict[str, Any] = {}
    if query.q:
        rx = {"$regex": re.escape(query.q), "$options": "i"}
        filt["$or"] = [{"name": rx}, {"emails": rx}]   # regex on array element
    if query.active is not None:
        filt["active"] = query.active
    return filt


def build_sort(sort_by: str, sort_order: str) -> str:
    prefix = "+" if sort_order == "asc" else "-"
    return f"{prefix}{sort_by}"
```

Pattern origin: `utils/audit_log/query.py` lines 91-99 (prefix calc) + `utils/admin_user/query.py`
lines 33-38 (`$or` with two fields). The `{"emails": rx}` form works because MongoDB
`$regex` matches any element of an array field — no `$elemMatch` needed for simple regex.

`active` is `bool | None` — when not `None` insert as exact bool (`filt["active"] = query.active`).
No "all" sentinel needed (unlike `status`/`role` in admin_user); the schema default is `None`
meaning no filter.

---

## 2. `backend/app/controllers/region.py` (NEW)

### Frozenset allow-lists (exact sets from SPEC §1.5)

```python
_ALLOWED_LIST_KEYS = frozenset({
    "page", "limit", "sortBy", "sortOrder", "q", "active",
})
_ALLOWED_OPTION_KEYS = frozenset({"q", "limit"})
```

- `audit_log.py` uses a plain `frozenset({"key",...})` literal — use the same style.
- `admin_user.py` uses a plain `set{...}` — **use `frozenset` to match audit_log pattern** (SPEC says "mirror `controllers/audit_log.py` exactly").

### Unknown-key rejection pattern (exact, from `audit_log.py` lines 50-54 / `admin_user.py` lines 52-56)

```python
unknown = set(request.query_params.keys()) - _ALLOWED_LIST_KEYS
if unknown:
    raise ValidationError(
        f"Unknown query parameter(s): {', '.join(sorted(unknown))}"
    )
```

Apply this block in `list_regions_controller` and `region_options_controller`.
The options controller in `audit_log.py` also does the unknown-key check (lines 65-69);
`admin_user.py` `get_options_controller` does NOT — follow audit_log pattern (SPEC says "mirror audit_log").

### `admin` dependency variable name

Audit_log and admin_user both use `_admin: AuthUser = Depends(get_current_admin)` for
read-only controllers that do not thread the email downstream. For mutating controllers
that need `actor_email`, use `admin: AuthUser = Depends(get_current_admin)` (no underscore
prefix) so the variable is not flagged as unused. See `admin_user.py` lines 101, 107:
```python
current_admin: AuthUser = Depends(get_current_admin)
```
Same pattern for region mutations — use `admin` (not `_admin`) so `admin.emailid` is accessible.

### `AuthUser.emailid` — confirmed

`core/auth_deps.py` line 28: `return AuthUser(emailid=user.emailid, ...)`. `schemas/auth.py`
line 24: `emailid: EmailStr`. The field is `.emailid` (not `.email`). Thread as
`actor_email=admin.emailid`.

### Full controller signatures (copy-pasteable)

```python
"""Region-domain controllers (thin: call service, wrap in envelope)."""

from __future__ import annotations

from fastapi import Depends, Request

from ..core.auth_deps import get_current_admin
from ..core.errors import ValidationError
from ..core.responses import SuccessEnvelope, success
from ..schemas.auth import AuthUser
from ..schemas.region import (
    RegionCreate,
    RegionListQuery,
    RegionOption,
    RegionOptionsQuery,
    RegionPublic,
    RegionUpdate,
)
from ..services.region.create import create_region
from ..services.region.delete import delete_region
from ..services.region.get import get_region
from ..services.region.list import list_regions
from ..services.region.options import search_region_options
from ..services.region.update import update_region

_ALLOWED_LIST_KEYS = frozenset({
    "page", "limit", "sortBy", "sortOrder", "q", "active",
})
_ALLOWED_OPTION_KEYS = frozenset({"q", "limit"})


async def list_regions_controller(
    request: Request,
    query: RegionListQuery = Depends(),
    _admin: AuthUser = Depends(get_current_admin),
) -> SuccessEnvelope[list[RegionPublic]]:
    """GET /admin/regions — paginated list."""
    unknown = set(request.query_params.keys()) - _ALLOWED_LIST_KEYS
    if unknown:
        raise ValidationError(
            f"Unknown query parameter(s): {', '.join(sorted(unknown))}"
        )
    items, meta = await list_regions(query)
    return success(items, meta=meta)


async def region_options_controller(
    request: Request,
    query: RegionOptionsQuery = Depends(),
    _admin: AuthUser = Depends(get_current_admin),
) -> SuccessEnvelope[list[RegionOption]]:
    """GET /admin/regions/options — async combobox."""
    unknown = set(request.query_params.keys()) - _ALLOWED_OPTION_KEYS
    if unknown:
        raise ValidationError(
            f"Unknown query parameter(s): {', '.join(sorted(unknown))}"
        )
    options = await search_region_options(query)
    return success(options)


async def create_region_controller(
    body: RegionCreate,
    admin: AuthUser = Depends(get_current_admin),
) -> SuccessEnvelope[RegionPublic]:
    """POST /admin/regions — create a region."""
    region = await create_region(body, actor_email=admin.emailid)
    return success(region, message="Region created")


async def get_region_controller(
    region_id: str,
    _admin: AuthUser = Depends(get_current_admin),
) -> SuccessEnvelope[RegionPublic]:
    """GET /admin/regions/{region_id}."""
    return success(await get_region(region_id))


async def update_region_controller(
    region_id: str,
    body: RegionUpdate,
    admin: AuthUser = Depends(get_current_admin),
) -> SuccessEnvelope[RegionPublic]:
    """PATCH /admin/regions/{region_id}."""
    region = await update_region(region_id, body, actor_email=admin.emailid)
    return success(region, message="Region updated")


async def delete_region_controller(
    region_id: str,
    admin: AuthUser = Depends(get_current_admin),
) -> SuccessEnvelope[None]:
    """DELETE /admin/regions/{region_id}."""
    await delete_region(region_id, actor_email=admin.emailid)
    return success(None, message="Region deleted")
```

Note: `create_region_controller` does NOT take `request: Request` (no unknown-key check
needed on POST body — body is validated by Pydantic). Same pattern as `admin_user.py`
`create_user_controller` (line 70-77, no `request` param).

---

## 3. `backend/app/routes/region.py` (NEW)

### Router declaration

```python
"""Region-management routes. Prefix: /admin/regions."""

from __future__ import annotations

from fastapi import APIRouter, Depends

from ..controllers import region as ctrl
from ..core.auth_deps import get_current_admin
from ..core.responses import SuccessEnvelope
from ..schemas.region import RegionOption, RegionPublic

router = APIRouter(
    prefix="/admin/regions",
    tags=["admin-regions"],
    dependencies=[Depends(get_current_admin)],
)
```

### Route registration order (CRITICAL — literal paths before /{region_id})

```python
# --- Collection-level ---
router.add_api_route(
    "",
    ctrl.list_regions_controller,
    methods=["GET"],
    response_model=SuccessEnvelope[list[RegionPublic]],
    summary="List regions (paginated)",
)

# /options MUST come before /{region_id} — FastAPI matches in registration order
router.add_api_route(
    "/options",
    ctrl.region_options_controller,
    methods=["GET"],
    response_model=SuccessEnvelope[list[RegionOption]],
    summary="Async combobox options",
)

router.add_api_route(
    "",
    ctrl.create_region_controller,
    methods=["POST"],
    response_model=SuccessEnvelope[RegionPublic],
    status_code=201,
    summary="Create a region",
)

# --- Item-level --- (after all literal-path routes)
router.add_api_route(
    "/{region_id}",
    ctrl.get_region_controller,
    methods=["GET"],
    response_model=SuccessEnvelope[RegionPublic],
    summary="Get a region by id",
)

router.add_api_route(
    "/{region_id}",
    ctrl.update_region_controller,
    methods=["PATCH"],
    response_model=SuccessEnvelope[RegionPublic],
    summary="Update a region",
)

router.add_api_route(
    "/{region_id}",
    ctrl.delete_region_controller,
    methods=["DELETE"],
    response_model=SuccessEnvelope[None],
    summary="Delete a region",
)
```

Pattern source: `routes/admin_user.py` (lines 29-80) for `status_code=201` on POST and
`response_model=SuccessEnvelope[None]` on DELETE. `routes/audit_log.py` confirms `/options`
literal precedes `/{log_id}` (lines 47-53 vs 65-71).

No `/facets` equivalent — Region has no facet endpoint in the SPEC.

---

## 4. `backend/app/routes/__init__.py` — Exact diff

Current file (lines 1-16):
```python
from . import admin_user, audit_log, auth, meta, user

api_router = APIRouter()
api_router.include_router(meta.router)
api_router.include_router(auth.router)
api_router.include_router(user.router)
api_router.include_router(admin_user.router)
api_router.include_router(audit_log.router)
```

Required change — add `region` to the import and append one `include_router` call:

**Line 7 (import) — change:**
```python
# BEFORE:
from . import admin_user, audit_log, auth, meta, user

# AFTER:
from . import admin_user, audit_log, auth, meta, region, user
```

**After `audit_log.router` include — append:**
```python
api_router.include_router(region.router)
```

Full file after edit:
```python
"""Route registry: aggregate every domain router into one ``api_router``."""

from __future__ import annotations

from fastapi import APIRouter

from . import admin_user, audit_log, auth, meta, region, user

api_router = APIRouter()
api_router.include_router(meta.router)
api_router.include_router(auth.router)
api_router.include_router(user.router)
api_router.include_router(admin_user.router)
api_router.include_router(audit_log.router)
api_router.include_router(region.router)

__all__ = ["api_router"]
```

---

## 5. AppError subclasses to use (from `core/errors.py`)

| Situation | Class | HTTP | code string |
|---|---|---|---|
| Unknown query param key | `ValidationError` | 400 | `VALIDATION_ERROR` |
| Invalid / non-existent region_id (bad ObjectId or no doc) | `NotFoundError` | 404 | `NOT_FOUND` |
| Duplicate region name (case-insensitive) | `ConflictError` | 409 | `CONFLICT` |

Exact message strings (match SPEC §1.4):
- NotFoundError: `"Region not found"`
- ConflictError: `"A region with this name already exists"`
- ValidationError (unknown key): `f"Unknown query parameter(s): {', '.join(sorted(unknown))}"`

All three are already defined in `core/errors.py` — no new error classes needed.

---

## 6. Key cross-cutting facts for coding agent

1. **`success()` call signatures** (`core/responses.py` line 51):
   - List: `success(items, meta=meta)` — `message` defaults to `""`
   - Mutations: `success(region, message="Region created")` / `"Region updated"` / `"Region deleted"`
   - Delete: `success(None, message="Region deleted")` with `response_model=SuccessEnvelope[None]`

2. **Router-level vs controller-level `Depends(get_current_admin)`**: Both patterns exist.
   The SPEC says to add the dependency at router level AND in each controller signature.
   Existing code does both (`routes/admin_user.py` line 24 + `controllers/admin_user.py`
   each function). Match that pattern exactly.

3. **`from ..controllers import region as ctrl`** import style: both `audit_log.py` and
   `admin_user.py` routes import the controller module with `as ctrl` alias.

4. **`__init__.py` files for new directories**:
   - `backend/app/utils/region/__init__.py` — empty (match `utils/audit_log/__init__.py`
     which is a single blank line)
   - `backend/app/services/region/__init__.py` — empty (same pattern)

5. **`actor_email` threading**: services in `create`/`update`/`delete` take
   `actor_email: str | None` (nullable — graceful if somehow called without admin).
   Controllers pass `actor_email=admin.emailid` where `admin` is the non-underscore
   variable from `Depends(get_current_admin)`.

6. **No `Request` param on non-list controllers**: only `list_regions_controller` and
   `region_options_controller` take `request: Request` (for unknown-key inspection).
   GET-by-id, POST, PATCH, DELETE do not need it.

7. **`build_sort` is identical** in all three existing util modules (`user/query.py` line 23,
   `admin_user/query.py` line 51, `audit_log/query.py` line 91) — prefix `"+"` for asc,
   `"-"` for desc, concatenated with field name. Copy verbatim.

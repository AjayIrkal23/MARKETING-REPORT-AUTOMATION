# Region Management — ADDENDUM (Consolidated Implementation Guide)

> **Synthesized from:** SPEC.md + 9 section notes (`be-model-schema`, `be-services`,
> `be-controller-routes-utils`, `be-audit-category`, `fe-types-api`, `fe-table-toolbar`,
> `fe-dialogs-hook`, `fe-page-routing-nav`, `fe-audit-ui-and-uiux`).
> **Authority:** SPEC.md is still the frozen contract. This file resolves
> contradictions, fills gaps, and provides copy-pasteable implementation notes
> so a coding agent never needs to re-read the section notes.

---

## BLOCKERS / OPEN ISSUES

1. **`RegionOption` type duplication resolved** — SPEC §2.1 says define `RegionOption` in
   `region.ts`; `fe-types-api` notes show this is structurally identical to the existing
   `AsyncOption` in `src/types/admin/options.ts`. **Decision:** export a type alias
   `export type RegionOption = AsyncOption` in `region.ts`; all API functions return
   `AsyncOption[]` or `RegionOption[]` (same type). This is NOT a blocker — it is a
   resolved decision.

2. **`ConfirmActionDialog` variant mismatch resolved** — SPEC says "reuse if covers
   delete/activate/deactivate; otherwise clone." The users' component uses `"enable"/"disable"`,
   NOT `"activate"/"deactivate"`. **Decision:** extend the shared component by adding
   `"activate"` and `"deactivate"` to `ConfirmActionVariant` in `types/admin/user-ui.ts`
   AND to `VARIANT_CONFIG` in `ConfirmActionDialog.tsx`. Both files must be edited together
   in one pass (not parallelized). NOT a blocker — resolved.

3. **`AuditCategoryBadge` color for `regions`** — SPEC says "indigo/violet" but `fe-table-toolbar`
   notes find both already in use (`auth=indigo`, `admin=violet`). `fe-audit-ui-and-uiux` notes
   choose **emerald** (outline badge style, no clash with solid Active badge). **Decision:**
   use emerald. Final color mapping is in §Wiring edits below.

4. **`loading` vs `isLoading` in `RegionTableProps`** — SPEC §2.2 and `fe-table-toolbar` notes
   both say the prop is named `loading` (bare). Use `loading`. `region-ui.ts`
   `UseRegionManagementResult` uses `loading` (not `isLoading`). Settled.

5. **No BLOCKERs remain.** All contradictions above are resolved with specific decisions.

---

## FILE TREE (all files to create / edit)

```
backend/app/
  models/region.py                           NEW
  schemas/region.py                          NEW
  utils/region/__init__.py                   NEW (empty)
  utils/region/query.py                      NEW
  services/region/__init__.py                NEW (empty)
  services/region/serialize.py               NEW
  services/region/list.py                    NEW
  services/region/get.py                     NEW
  services/region/create.py                  NEW
  services/region/update.py                  NEW
  services/region/delete.py                  NEW
  services/region/options.py                 NEW
  controllers/region.py                      NEW
  routes/region.py                           NEW
  --- wiring edits (one agent, sequential) ---
  models/__init__.py                         EDIT
  core/database.py                           EDIT
  routes/__init__.py                         EDIT
  models/audit_log.py                        EDIT (AuditCategory Literal)
  schemas/audit_log.py                       EDIT (AuditCategory Literal)
  services/audit_log/options.py              EDIT (_CATEGORIES list)
  services/audit/events.py                   EDIT (append audit_region_event)

frontend/src/
  types/admin/region.ts                      NEW
  types/admin/region-ui.ts                   NEW
  api/admin/regions/list.ts                  NEW
  api/admin/regions/get.ts                   NEW
  api/admin/regions/create.ts               NEW
  api/admin/regions/update.ts               NEW
  api/admin/regions/remove.ts               NEW
  api/admin/regions/options.ts              NEW
  components/admin/regions/
    RegionTable.tsx                          NEW
    RegionTableToolbar.tsx                   NEW
    RegionTablePagination.tsx               NEW
    RegionActiveBadge.tsx                   NEW
    RowActionsMenu.tsx                       NEW
    EmailChipInput.tsx                       NEW (~80 lines)
    CreateRegionDialog.tsx                   NEW (~200 lines)
    EditRegionDialog.tsx                     NEW (~190 lines)
    ViewRegionSheet.tsx                      NEW (~170 lines)
    hooks/useRegionManagement.ts            NEW (~130 lines)
    hooks/useRegionMutations.ts             NEW (~80 lines)
    ConfirmActionDialog.tsx                  NEW (local region version)
  pages/admin/regions/index.tsx             NEW
  --- wiring edits (one agent, sequential) ---
  components/layout/nav-items.ts            EDIT (add MapPin + Region nav item)
  App.tsx                                    EDIT (import + route)
  types/admin/audit-log.ts                  EDIT (add "regions" to AuditCategory union)
  components/admin/audit-logs/AuditCategoryBadge.tsx   EDIT (add regions entry)
  components/admin/audit-logs/AuditLogToolbar.tsx      EDIT (add "regions" to STATIC_CATEGORIES)
  types/admin/user-ui.ts                    EDIT (extend ConfirmActionVariant)
  components/admin/users/ConfirmActionDialog.tsx       EDIT (add activate/deactivate variants)
```

---

## BACKEND

---

### `backend/app/models/region.py` — analog: `models/audit_log.py`

```python
from __future__ import annotations

from datetime import datetime, timezone
from typing import Annotated

from beanie import Document, Indexed
from pydantic import Field


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


class Region(Document):
    name:       Annotated[str, Indexed()]
    emails:     list[str] = Field(default_factory=list)
    active:     Annotated[bool, Indexed()] = True
    created_at: Annotated[datetime, Indexed()] = Field(default_factory=_now_utc)
    updated_at: datetime = Field(default_factory=_now_utc)

    class Settings:
        name = "regions"
```

Key gotchas:
- `emails` is `list[str]` on the model (plain strings stored in MongoDB). `EmailStr` is used in schemas only.
- `updated_at` has NO auto-update hook — bump it manually in update service (`doc.updated_at = _now_utc()`).
- `Annotated[T, Indexed()]` style (NOT `Settings.indexes`) — matches `audit_log.py`.
- `name` gets `Indexed()` without `unique=True`; uniqueness enforced via case-insensitive regex in services.

---

### `backend/app/schemas/region.py` — analog: `schemas/audit_log.py` + `schemas/admin_user.py`

```python
from __future__ import annotations

import re
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, EmailStr, Field, field_validator

from .common import PageQuery

RegionSortBy = Literal["name", "active", "created_at", "updated_at"]


class RegionListQuery(PageQuery):
    sortBy: RegionSortBy = "created_at"
    # sortOrder, page, limit, skip inherited from PageQuery
    q: str | None = Field(default=None, max_length=200)
    active: bool | None = None   # FastAPI coerces ?active=true/false


class RegionOptionsQuery(BaseModel):
    q: str | None = Field(default=None, max_length=200)
    limit: int = Field(default=20, ge=1, le=50)   # cap at 50 (stricter than user/audit 200)


class RegionCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    emails: list[EmailStr] = Field(default_factory=list)
    active: bool = True

    @field_validator("name", mode="before")
    @classmethod
    def strip_name(cls, v: str) -> str:
        if isinstance(v, str):
            return v.strip()
        return v

    @field_validator("emails", mode="before")
    @classmethod
    def normalize_emails(cls, v: list | None) -> list:
        if not v:
            return []
        seen: list[str] = []
        seen_set: set[str] = set()
        for item in v:
            normalized = str(item).lower().strip()
            if normalized not in seen_set:
                seen_set.add(normalized)
                seen.append(normalized)
        if len(seen) > 100:
            raise ValueError("emails list exceeds maximum of 100 recipients")
        return seen


class RegionUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    emails: list[EmailStr] | None = None
    active: bool | None = None

    @field_validator("name", mode="before")
    @classmethod
    def strip_name(cls, v: str | None) -> str | None:
        if isinstance(v, str):
            return v.strip()
        return v

    @field_validator("emails", mode="before")
    @classmethod
    def normalize_emails(cls, v: list | None) -> list | None:
        if v is None:
            return None
        if not v:
            return []
        seen: list[str] = []
        seen_set: set[str] = set()
        for item in v:
            normalized = str(item).lower().strip()
            if normalized not in seen_set:
                seen_set.add(normalized)
                seen.append(normalized)
        if len(seen) > 100:
            raise ValueError("emails list exceeds maximum of 100 recipients")
        return seen


class RegionPublic(BaseModel):
    id: str
    name: str
    emails: list[str]   # NOT list[EmailStr] — output DTO, no re-validation
    active: bool
    created_at: datetime
    updated_at: datetime


class RegionOption(BaseModel):
    value: str           # str(region.id)
    label: str           # region.name
    sublabel: str | None = None   # e.g. "3 recipient(s) · Active"
```

Key gotchas:
- `EmailStr` validators run AFTER `mode="before"` validators. Lowercasing in `mode="before"` feeds already-normalized strings to pydantic's EmailStr check.
- `model_validator` is NOT needed — no cross-field logic.
- `RegionOptionsQuery.limit` max is 50, NOT 200 (unlike user/audit options queries).
- `from __future__ import annotations` is mandatory (all existing schema files include it).

---

### `backend/app/utils/region/__init__.py` — empty (1 blank line)

### `backend/app/utils/region/query.py` — analog: `utils/audit_log/query.py`

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
        filt["$or"] = [{"name": rx}, {"emails": rx}]   # $regex on array field matches any element
    if query.active is not None:
        filt["active"] = query.active
    return filt


def build_sort(sort_by: str, sort_order: str) -> str:
    prefix = "+" if sort_order == "asc" else "-"
    return f"{prefix}{sort_by}"
```

Key gotchas:
- `re.escape` is mandatory (ReDoS guard, OWASP A05).
- `{"emails": rx}` regex against an array field in MongoDB matches any element — no `$elemMatch` needed.
- `active` is inserted as an exact `bool` (not string).

---

### `backend/app/services/region/__init__.py` — empty (1 blank line)

### `backend/app/services/region/serialize.py` — analog: `services/audit_log/serialize.py`

```python
from __future__ import annotations

from typing import TYPE_CHECKING

from ...schemas.region import RegionPublic

if TYPE_CHECKING:
    from ...models.region import Region


def to_public(doc: "Region") -> RegionPublic:
    return RegionPublic(
        id=str(doc.id),
        name=doc.name,
        emails=doc.emails,
        active=doc.active,
        created_at=doc.created_at,
        updated_at=doc.updated_at,
    )
```

- `TYPE_CHECKING` guard avoids circular import.
- `str(doc.id)` — ObjectId never exposed directly.

---

### `backend/app/services/region/list.py`

```python
from __future__ import annotations

from math import ceil

from ...core.responses import PaginationMeta
from ...models.region import Region
from ...schemas.region import RegionListQuery, RegionPublic
from ...utils.region.query import build_region_filter, build_sort
from .serialize import to_public


async def list_regions(query: RegionListQuery) -> tuple[list[RegionPublic], PaginationMeta]:
    filt = build_region_filter(query)
    total = await Region.find(filt).count()
    docs = (
        await Region.find(filt)
        .sort(build_sort(query.sortBy, query.sortOrder))
        .skip(query.skip)
        .limit(query.limit)
        .to_list()
    )
    items = [to_public(doc) for doc in docs]
    meta = PaginationMeta(
        page=query.page,
        limit=query.limit,
        total=total,
        totalPages=ceil(total / query.limit) if query.limit else 0,
        sortBy=query.sortBy,
        sortOrder=query.sortOrder,
    )
    return items, meta
```

---

### `backend/app/services/region/get.py`

```python
from __future__ import annotations

from beanie import PydanticObjectId

from ...core.errors import NotFoundError
from ...models.region import Region
from ...schemas.region import RegionPublic
from .serialize import to_public


async def get_region(region_id: str) -> RegionPublic:
    try:
        oid = PydanticObjectId(region_id)
    except Exception:
        raise NotFoundError("Region not found.")

    doc: Region | None = await Region.get(oid)
    if doc is None:
        raise NotFoundError("Region not found.")

    return to_public(doc)
```

- Same error message for invalid ID vs missing doc (OWASP: no enumeration).

---

### `backend/app/services/region/create.py`

```python
from __future__ import annotations

import re

from ...core.errors import ConflictError
from ...models.region import Region, _now_utc
from ...schemas.region import RegionCreate, RegionPublic
from ..audit.events import audit_region_event
from .serialize import to_public


async def create_region(data: RegionCreate, actor_email: str | None) -> RegionPublic:
    existing = await Region.find_one(
        {"name": {"$regex": f"^{re.escape(data.name)}$", "$options": "i"}}
    )
    if existing is not None:
        raise ConflictError("A region with this name already exists.")

    now = _now_utc()
    doc = Region(
        name=data.name,
        emails=data.emails,
        active=data.active,
        created_at=now,
        updated_at=now,
    )
    await doc.insert()

    await audit_region_event(
        "region.created",
        f"Created region '{doc.name}'",
        actor_email=actor_email,
        extra={
            "region_id": str(doc.id),
            "active": doc.active,
            "recipient_count": len(doc.emails),
        },
    )
    return to_public(doc)
```

---

### `backend/app/services/region/update.py`

```python
from __future__ import annotations

import re

from beanie import PydanticObjectId

from ...core.errors import ConflictError, NotFoundError
from ...models.region import Region, _now_utc
from ...schemas.region import RegionPublic, RegionUpdate
from ..audit.events import audit_region_event
from .serialize import to_public


async def update_region(
    region_id: str, data: RegionUpdate, actor_email: str | None
) -> RegionPublic:
    try:
        oid = PydanticObjectId(region_id)
    except Exception:
        raise NotFoundError("Region not found.")

    doc: Region | None = await Region.get(oid)
    if doc is None:
        raise NotFoundError("Region not found.")

    changed: list[str] = []
    update_data = data.model_dump(exclude_unset=True)

    if "name" in update_data:
        new_name = update_data["name"]
        existing = await Region.find_one({
            "name": {"$regex": f"^{re.escape(new_name)}$", "$options": "i"},
            "_id": {"$ne": oid},
        })
        if existing is not None:
            raise ConflictError("A region with this name already exists.")
        doc.name = new_name
        changed.append("name")

    if "emails" in update_data:
        doc.emails = update_data["emails"]
        changed.append("emails")

    if "active" in update_data:
        doc.active = update_data["active"]
        changed.append("active")

    doc.updated_at = _now_utc()
    await doc.save()

    await audit_region_event(
        "region.updated",
        f"Updated region '{doc.name}'",
        actor_email=actor_email,
        extra={"region_id": str(doc.id), "changed": changed},
    )
    return to_public(doc)
```

- `model_dump(exclude_unset=True)` is critical for `active: bool | None` — a falsy `False` must not be skipped.
- `await doc.save()` (Beanie 2.x) persists full document.
- Uniqueness check for update excludes self via `"_id": {"$ne": oid}`.

---

### `backend/app/services/region/delete.py`

```python
from __future__ import annotations

from beanie import PydanticObjectId

from ...core.errors import NotFoundError
from ...models.region import Region
from ..audit.events import audit_region_event


async def delete_region(region_id: str, actor_email: str | None) -> None:
    try:
        oid = PydanticObjectId(region_id)
    except Exception:
        raise NotFoundError("Region not found.")

    doc: Region | None = await Region.get(oid)
    if doc is None:
        raise NotFoundError("Region not found.")

    name = doc.name   # capture before delete
    await doc.delete()

    await audit_region_event(
        "region.deleted",
        f"Deleted region '{name}'",
        actor_email=actor_email,
        extra={"region_id": region_id, "name": name},
    )
```

- No self-guard or last-record guard (SPEC is silent; do not invent one).

---

### `backend/app/services/region/options.py`

```python
from __future__ import annotations

import re
from typing import Any

from ...models.region import Region
from ...schemas.region import RegionOption, RegionOptionsQuery


async def search_region_options(query: RegionOptionsQuery) -> list[RegionOption]:
    filt: dict[str, Any] = {}
    if query.q:
        filt["name"] = {"$regex": re.escape(query.q), "$options": "i"}

    docs = (
        await Region.find(filt)
        .sort("+name")
        .limit(query.limit)
        .to_list()
    )
    return [
        RegionOption(
            value=str(doc.id),
            label=doc.name,
            sublabel=(
                f"{len(doc.emails)} recipient(s) · "
                f"{'Active' if doc.active else 'Inactive'}"
            ),
        )
        for doc in docs
    ]
```

---

### `backend/app/controllers/region.py` — analog: `controllers/audit_log.py`

```python
"""Region-domain controllers (thin: call service, wrap in envelope)."""

from __future__ import annotations

from fastapi import Depends, Request

from ..core.auth_deps import get_current_admin
from ..core.errors import ValidationError
from ..core.responses import SuccessEnvelope, success
from ..schemas.auth import AuthUser
from ..schemas.region import (
    RegionCreate, RegionListQuery, RegionOption,
    RegionOptionsQuery, RegionPublic, RegionUpdate,
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
    unknown = set(request.query_params.keys()) - _ALLOWED_LIST_KEYS
    if unknown:
        raise ValidationError(f"Unknown query parameter(s): {', '.join(sorted(unknown))}")
    items, meta = await list_regions(query)
    return success(items, meta=meta)


async def region_options_controller(
    request: Request,
    query: RegionOptionsQuery = Depends(),
    _admin: AuthUser = Depends(get_current_admin),
) -> SuccessEnvelope[list[RegionOption]]:
    unknown = set(request.query_params.keys()) - _ALLOWED_OPTION_KEYS
    if unknown:
        raise ValidationError(f"Unknown query parameter(s): {', '.join(sorted(unknown))}")
    options = await search_region_options(query)
    return success(options)


async def create_region_controller(
    body: RegionCreate,
    admin: AuthUser = Depends(get_current_admin),
) -> SuccessEnvelope[RegionPublic]:
    region = await create_region(body, actor_email=admin.emailid)
    return success(region, message="Region created")


async def get_region_controller(
    region_id: str,
    _admin: AuthUser = Depends(get_current_admin),
) -> SuccessEnvelope[RegionPublic]:
    return success(await get_region(region_id))


async def update_region_controller(
    region_id: str,
    body: RegionUpdate,
    admin: AuthUser = Depends(get_current_admin),
) -> SuccessEnvelope[RegionPublic]:
    region = await update_region(region_id, body, actor_email=admin.emailid)
    return success(region, message="Region updated")


async def delete_region_controller(
    region_id: str,
    admin: AuthUser = Depends(get_current_admin),
) -> SuccessEnvelope[None]:
    await delete_region(region_id, actor_email=admin.emailid)
    return success(None, message="Region deleted")
```

Key gotchas:
- Read-only controllers use `_admin` (underscore = unused); mutation controllers use `admin` (no underscore) so `.emailid` is accessible.
- `list_regions_controller` and `region_options_controller` both take `request: Request` (for unknown-key check). POST/PATCH/DELETE/GET-by-id do NOT take `request`.
- `frozenset` (not plain `set`) — matches `audit_log.py` pattern.
- `AuthUser.emailid` is confirmed correct (NOT `.email`) — from `schemas/auth.py` line 24.

---

### `backend/app/routes/region.py` — analog: `routes/audit_log.py`

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

# CRITICAL: literal paths BEFORE /{region_id} — FastAPI matches in registration order
router.add_api_route(
    "",
    ctrl.list_regions_controller,
    methods=["GET"],
    response_model=SuccessEnvelope[list[RegionPublic]],
    summary="List regions (paginated)",
)
router.add_api_route(
    "/options",                                   # MUST be before /{region_id}
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

---

## WIRING EDITS — BACKEND (one agent, sequential)

### `backend/app/models/__init__.py`

Current:
```python
from .audit_log import AuditLog
from .user import User
__all__ = ["User", "AuditLog"]
```
After:
```python
from .audit_log import AuditLog
from .region import Region
from .user import User
__all__ = ["User", "AuditLog", "Region"]
```

### `backend/app/core/database.py`

Current line 16: `from ..models import AuditLog, User`
Current line 21: `DOCUMENT_MODELS = [User, AuditLog]`

After:
```python
from ..models import AuditLog, Region, User
# ...
DOCUMENT_MODELS = [User, AuditLog, Region]
```

### `backend/app/routes/__init__.py`

Current line 7: `from . import admin_user, audit_log, auth, meta, user`

After line 7: `from . import admin_user, audit_log, auth, meta, region, user`

Append after `api_router.include_router(audit_log.router)`:
```python
api_router.include_router(region.router)
```

### `backend/app/models/audit_log.py` — line 17

```python
# Before:
AuditCategory = Literal["http", "auth", "admin", "data", "system", "cron", "security"]
# After:
AuditCategory = Literal["http", "auth", "admin", "data", "system", "cron", "security", "regions"]
```

### `backend/app/schemas/audit_log.py` — line 22 (must stay in sync with models/audit_log.py)

Same change as above (same string, different file).

### `backend/app/services/audit_log/options.py` — line 28

```python
# Before:
_CATEGORIES: list[str] = ["http", "auth", "admin", "data", "system", "cron", "security"]
# After:
_CATEGORIES: list[str] = ["http", "auth", "admin", "data", "system", "cron", "security", "regions"]
```

### `backend/app/services/audit/events.py` — append at end of file

```python
async def audit_region_event(
    action: str,
    summary: str,
    outcome: str = "success",
    actor_email: str | None = None,
    extra: dict[str, Any] | None = None,
) -> None:
    """Record a region-management mutation event (created, updated, deleted).

    Args:
        action:      Dot-namespaced identifier, e.g. ``"region.created"``.
        summary:     Human-readable description, e.g. ``"Created region 'West'"``.
        outcome:     ``"success"`` | ``"failure"`` | ``"error"``; defaults to ``"success"``.
        actor_email: Admin actor email threaded from ``admin.emailid``; ``None`` if unavailable.
        extra:       Arbitrary extra context (region_id, changed fields, etc.).
    """
    await record_audit(
        category="regions",
        action=action,
        summary=summary,
        outcome=outcome,
        source="service",
        actor_email=actor_email,
        extra=extra,
    )
```

Note: `Any` and `record_audit` are already imported in `events.py` — no new imports needed.

**Audit actions table:**

| Service file               | action string       | extra keys                                   |
|----------------------------|---------------------|----------------------------------------------|
| `services/region/create.py`| `"region.created"`  | `region_id`, `active`, `recipient_count`     |
| `services/region/update.py`| `"region.updated"`  | `region_id`, `changed` (list of field names) |
| `services/region/delete.py`| `"region.deleted"`  | `region_id`, `name`                          |

**Dual-logging is intentional and expected.** The `AuditMiddleware` writes a `category="admin"`
HTTP record for every `/admin/*` request. The explicit `audit_region_event` calls write a second
`category="regions"` service record. This is the same pattern as auth routes. Do NOT add
`/admin/regions` to `audit_skip_path_prefixes`.

---

## FRONTEND

---

### `src/types/admin/region.ts` — analog: `types/admin/user.ts`, `types/admin/audit-log.ts`

```ts
/**
 * Admin region API contracts — aligned with the backend `region` domain.
 * Contract source: .planning/regions/SPEC.md §2.1.
 */

import type { PageQuery } from "@/types/api/envelope"
import type { AsyncOption } from "@/types/admin/options"

export type RegionSortBy = "name" | "active" | "created_at" | "updated_at"

export interface Region {
  id: string
  name: string
  emails: string[]
  active: boolean
  created_at: string   // ISO-8601 snake_case (matches backend RegionPublic)
  updated_at: string   // ISO-8601
}

export interface RegionListQuery extends PageQuery {
  sortBy?: RegionSortBy
  /** Case-insensitive search over name + emails. */
  q?: string
  /** "all" = UI sentinel, stripped before API request. */
  active?: boolean | "all"
}

export interface CreateRegionInput {
  name: string
  emails: string[]
  active: boolean
}

export interface UpdateRegionInput {
  name?: string
  emails?: string[]
  active?: boolean
}

/** Type alias — identical to AsyncOption from types/admin/options. Do NOT create a new shape. */
export type RegionOption = AsyncOption
```

Key gotchas:
- `created_at`/`updated_at` are snake_case (unlike `AdminUser.createdAt`) — backend serializes directly.
- `RegionOption = AsyncOption` — do NOT declare a separate interface. `AsyncOption` already has `{ value; label; sublabel? }`.
- `active?: boolean | "all"` — `"all"` is a UI sentinel only, stripped in `list.ts` normalize().

---

### `src/types/admin/region-ui.ts` — analog: `types/admin/user-ui.ts`

```ts
import type { Region, RegionListQuery, CreateRegionInput, UpdateRegionInput, RegionSortBy } from "./region"
import type { PaginationMeta } from "@/types/api/envelope"

// Redeclared locally per project convention (user-ui.ts + audit-log-ui.ts both do this)
export interface DialogBaseProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export interface CreateRegionDialogProps extends DialogBaseProps {
  onSubmitted: () => void
}

export interface EditRegionDialogProps extends DialogBaseProps {
  region: Region | null
  onSubmitted: () => void   // always refetch (no optimistic Region payload returned)
}

export interface ViewRegionSheetProps extends DialogBaseProps {
  region: Region | null
}

export interface ConfirmRegionActionProps extends DialogBaseProps {
  variant: "delete" | "activate" | "deactivate"
  targetLabel: string       // region.name shown in confirmation copy
  onConfirm: () => void
  isLoading?: boolean
}

export interface RegionActiveBadgeProps {
  active: boolean
  compact?: boolean
}

export interface RowActionsMenuProps {
  region: Region
  onView: (region: Region) => void
  onEdit: (region: Region) => void
  onDelete: (region: Region) => void
  onToggleActive: (region: Region) => void
}

export interface RegionTableProps {
  rows: Region[]
  loading: boolean       // NOT isLoading — SPEC §2.2 + fe-table-toolbar notes
  error: string | null
  sortBy: RegionSortBy | undefined
  sortOrder: "asc" | "desc" | undefined
  onSort: (col: RegionSortBy) => void
  onView: (region: Region) => void
  onEdit: (region: Region) => void
  onDelete: (region: Region) => void
  onToggleActive: (region: Region) => void
}

export interface RegionTableToolbarProps {
  query: RegionListQuery
  onQueryChange: (patch: Partial<RegionListQuery>) => void
  onCreate: () => void
}

export interface RegionTablePaginationProps {
  meta: PaginationMeta | null
  isLoading: boolean
  onPageChange: (page: number) => void
  onLimitChange: (limit: number) => void
}

export type RegionDialogState =
  | { type: "none" }
  | { type: "create" }
  | { type: "view";           region: Region }
  | { type: "edit";           region: Region }
  | { type: "confirm-delete"; region: Region }
  | { type: "confirm-toggle"; region: Region }   // resolves to activate or deactivate at render time

export interface UseRegionManagementResult {
  query: RegionQueryState
  setPage: (page: number) => void
  setLimit: (limit: number) => void
  setSort: (sortBy: RegionSortBy, sortOrder: "asc" | "desc") => void
  setSearch: (q: string) => void
  setActive: (active: boolean | "all") => void
  rows: Region[]
  meta: PaginationMeta | null
  loading: boolean
  error: string | null
  dialog: RegionDialogState
  openDialog: (d: RegionDialogState) => void
  closeDialog: () => void
  actions: {
    refetch: () => void
    remove: (id: string) => Promise<void>
    toggleActive: (region: Region) => Promise<void>
  }
}

export type RegionQueryState = {
  page: number
  limit: number
  sortBy: RegionSortBy
  sortOrder: "asc" | "desc"
  q: string
  active: boolean | "all"
}
```

---

### `src/api/admin/regions/list.ts`

```ts
import { buildQuery, getList } from "@/api/client"
import type { PaginatedResult } from "@/types/api/envelope"
import type { Region, RegionListQuery } from "@/types/admin/region"

function normalize(q: RegionListQuery): Record<string, string | number | undefined> {
  return {
    page: q.page,
    limit: q.limit,
    sortBy: q.sortBy,
    sortOrder: q.sortOrder,
    q: q.q,
    active:
      q.active === "all" ? undefined
      : q.active === true ? "true"
      : q.active === false ? "false"
      : undefined,
  }
}

export function listRegions(query: RegionListQuery = {}): Promise<PaginatedResult<Region>> {
  return getList<Region>(`/admin/regions${buildQuery(normalize(query))}`)
}
```

Key gotcha: `buildQuery` accepts `Record<string, string | number | undefined>` — TypeScript rejects raw `boolean`. Always convert `active` via explicit ternary.

---

### `src/api/admin/regions/get.ts`

```ts
import { getData } from "@/api/client"
import type { Region } from "@/types/admin/region"

export function getRegion(id: string): Promise<Region> {
  return getData<Region>(`/admin/regions/${id}`)
}
```

### `src/api/admin/regions/create.ts`

```ts
import { postData } from "@/api/client"
import type { Region, CreateRegionInput } from "@/types/admin/region"

export function createRegion(input: CreateRegionInput): Promise<Region> {
  return postData<Region>("/admin/regions", input)
}
```

### `src/api/admin/regions/update.ts`

```ts
import { patchData } from "@/api/client"
import type { Region, UpdateRegionInput } from "@/types/admin/region"

export function updateRegion(id: string, input: UpdateRegionInput): Promise<Region> {
  return patchData<Region>(`/admin/regions/${id}`, input)
}
```

### `src/api/admin/regions/remove.ts`

```ts
import { deleteData } from "@/api/client"

export function removeRegion(id: string): Promise<null> {
  return deleteData<null>(`/admin/regions/${id}`)
}
```

### `src/api/admin/regions/options.ts`

```ts
import { buildQuery, getData } from "@/api/client"
import type { AsyncOption } from "@/types/admin/options"

export function searchRegionOptions(q: string): Promise<AsyncOption[]> {
  return getData<AsyncOption[]>(
    `/admin/regions/options${buildQuery({ q, limit: 20 })}`,
  )
}
```

---

### `src/components/admin/regions/RegionActiveBadge.tsx`

Analog: `UserStatusBadge.tsx`

```tsx
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { RegionActiveBadgeProps } from "@/types/admin/region-ui"

const STATUS_MAP = {
  active: {
    label: "Active",
    variant: "default" as const,
    className: "border-transparent bg-emerald-600 text-white dark:bg-emerald-700",
  },
  inactive: {
    label: "Inactive",
    variant: "outline" as const,
    className: "border-border text-muted-foreground",
  },
} as const

export function RegionActiveBadge({ active, compact = false }: RegionActiveBadgeProps) {
  const cfg = active ? STATUS_MAP.active : STATUS_MAP.inactive
  return (
    <Badge
      variant={cfg.variant}
      className={cn(cfg.className, compact && "text-[10px] px-1.5 h-4")}
      aria-label={`Region status: ${cfg.label}`}
    >
      {cfg.label}
    </Badge>
  )
}
```

- Active badge: solid emerald fill (NOT outline). White on emerald-600 is ~4.8:1 (passes AA).
- Inactive: `variant="outline"` + muted-foreground override.

---

### `src/components/admin/regions/RegionTable.tsx`

Analog: `UserTable.tsx`

Internal `SortableHead`:
```tsx
type SortKey = RegionSortBy  // "name" | "active" | "created_at" | "updated_at"

interface SortableHeadProps {
  label: string
  col: SortKey
  current: RegionSortBy | undefined
  order: "asc" | "desc" | undefined
  onSort: (col: SortKey) => void
  className?: string
}

function SortableHead({ label, col, current, order, onSort, className }: SortableHeadProps) {
  const active = current === col
  const Icon = active ? (order === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown
  return (
    <TableHead
      className={cn(
        "cursor-pointer select-none whitespace-nowrap hover:text-foreground",
        active ? "text-foreground" : "text-muted-foreground",
        className,
      )}
      onClick={() => onSort(col)}
      aria-sort={active ? (order === "asc" ? "ascending" : "descending") : "none"}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <Icon className={cn("size-3 shrink-0", active ? "opacity-100" : "opacity-40")} aria-hidden />
      </span>
    </TableHead>
  )
}
```

Column headers:
```tsx
<SortableHead label="Name"       col="name"       {...sortProps} className="min-w-[200px]" />
<TableHead className="text-muted-foreground">Recipients</TableHead>
<SortableHead label="Status"     col="active"     {...sortProps} />
<SortableHead label="Updated"    col="updated_at" {...sortProps} />
<TableHead className="w-10" />
```

Recipients cell (table, read-only): show first 3, "+N more" for overflow, `—` when empty:
```tsx
{row.emails.length === 0 ? (
  <span className="text-muted-foreground">—</span>
) : (
  <div className="flex flex-wrap items-center gap-1">
    {row.emails.slice(0, 3).map((email) => (
      <span key={email} className="font-mono text-xs text-muted-foreground rounded bg-muted px-1.5 py-0.5">
        {email}
      </span>
    ))}
    {row.emails.length > 3 && (
      <span className="text-xs text-muted-foreground">+{row.emails.length - 3} more</span>
    )}
  </div>
)}
```

Date helper (copy from UserTable):
```ts
import { format, parseISO } from "date-fns"
function fmtDate(iso: string): string {
  try { return format(parseISO(iso), "dd MMM yyyy") } catch { return "—" }
}
```

Loading: `const SKELETON_ROWS = 8` — 5 columns, varies widths.
Empty state: `MapPin` icon + "No regions found" + "Adjust the filters or create a new region."
Error state: `AlertTriangle` icon + "Failed to load regions" + `{error}`.
Both empty/error states can be rendered as `<TableRow><TableCell colSpan={5}>...</TableCell></TableRow>`.

---

### `src/components/admin/regions/RegionTableToolbar.tsx`

```tsx
const ACTIVE_OPTIONS: FilterComboboxOption[] = [
  { value: "true",  label: "Active"   },
  { value: "false", label: "Inactive" },
]

export function RegionTableToolbar({ query, onQueryChange, onCreate }: RegionTableToolbarProps) {
  function applyFilter(patch: Partial<typeof query>) {
    onQueryChange({ page: 1, ...patch })
  }

  const currentActive =
    query.active !== undefined && query.active !== "all"
      ? String(query.active)   // boolean → "true"/"false"
      : null

  return (
    <div role="toolbar" aria-label="Region table filters" className="flex flex-wrap items-center gap-2">
      <div className="flex flex-1 flex-wrap items-center gap-2">
        <div className="min-w-64 flex-[2]">
          <AsyncCombobox
            value={query.q ?? null}
            onChange={(value) => applyFilter({ q: value ?? undefined })}
            fetchOptions={(q) => searchRegionOptions(q)}
            placeholder="Search regions…"
            emptyText="No regions found."
            allowClear
            aria-label="Search regions"
          />
        </div>
        <FilterCombobox
          value={currentActive}
          onChange={(v) => applyFilter({ active: v === null ? "all" : v === "true" })}
          options={ACTIVE_OPTIONS}
          allLabel="All statuses"
          aria-label="Filter by status"
          className="min-w-44 flex-1"
        />
      </div>
      <Button size="sm" onClick={onCreate} aria-label="Create region" className="shrink-0 gap-1.5">
        <PlusIcon className="size-3.5" aria-hidden />
        Create region
      </Button>
    </div>
  )
}
```

Active filter state mapping:
- `query.active === "all"` / `undefined` → `currentActive = null` → "All statuses"
- `query.active === true` → `currentActive = "true"` → "Active"
- `query.active === false` → `currentActive = "false"` → "Inactive"
- On change: `v === "true"` → `active: true`; `v === "false"` → `active: false`; `v === null` → `active: "all"`

---

### `src/components/admin/regions/RegionTablePagination.tsx`

Near-clone of `UserTablePagination.tsx`. Change:
1. Import `RegionTablePaginationProps` from `@/types/admin/region-ui`
2. Export name: `RegionTablePagination`
3. Props: `meta`, `isLoading`, `onPageChange`, `onLimitChange`
4. `PAGE_SIZE_OPTIONS = [10, 20, 50]` — same as users

---

### `src/components/admin/regions/RowActionsMenu.tsx`

Analog: `users/RowActionsMenu.tsx`. Key differences:
- No `currentUserEmail` guard (no self-reference for regions)
- Toggle item is contextual on `region.active`:

```tsx
{region.active ? (
  <DropdownMenuItem onSelect={() => onToggleActive(region)}>
    <ToggleLeft className="mr-2 size-4 text-muted-foreground" />
    Deactivate
  </DropdownMenuItem>
) : (
  <DropdownMenuItem onSelect={() => onToggleActive(region)}>
    <ToggleRight className="mr-2 size-4 text-muted-foreground" />
    Activate
  </DropdownMenuItem>
)}
<DropdownMenuItem variant="destructive" onSelect={() => onDelete(region)}>
  <Trash2 className="mr-2 size-4" />
  Delete
</DropdownMenuItem>
```

Trigger: `className="size-7 text-muted-foreground hover:text-foreground"`, `size="icon"`, `variant="ghost"`.
Content: `className="w-48"`, `align="end"`. Label shows `region.name`.

---

### `src/components/admin/regions/EmailChipInput.tsx` (~80 lines)

```tsx
import { useRef, useState, KeyboardEvent } from "react"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

interface EmailChipInputProps {
  value: string[]
  onChange: (emails: string[]) => void
  disabled?: boolean
  error?: string
  id?: string
}

export function EmailChipInput({ value, onChange, disabled, error, id }: EmailChipInputProps) {
  const [inputVal, setInputVal] = useState("")
  const [inputError, setInputError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  function tryAdd(raw: string) {
    const email = raw.trim().toLowerCase()
    if (!email) return
    if (!EMAIL_RE.test(email)) { setInputError("Invalid email address."); return }
    if (value.includes(email)) { setInputError("Already added."); return }
    if (value.length >= 100) { setInputError("Maximum 100 recipients."); return }
    onChange([...value, email])
    setInputVal("")
    setInputError(null)
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") { e.preventDefault(); tryAdd(inputVal) }
    else if (e.key === "Backspace" && inputVal === "" && value.length > 0) {
      onChange(value.slice(0, -1))
    }
  }

  return (
    <div
      role="group"
      aria-label="Recipient email addresses"
      className={cn(
        "min-h-[2.5rem] w-full rounded-md border border-input bg-background px-3 py-2",
        "flex flex-wrap gap-1.5 focus-within:ring-2 focus-within:ring-ring/50",
        error && "border-destructive",
        disabled && "cursor-not-allowed opacity-50",
      )}
      onClick={() => inputRef.current?.focus()}
    >
      {value.map((email) => (
        <span key={email} className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 font-mono text-xs text-muted-foreground">
          {email}
          <button
            type="button"
            disabled={disabled}
            aria-label={`Remove ${email}`}
            onClick={(e) => { e.stopPropagation(); onChange(value.filter((e2) => e2 !== email)) }}
            className="ml-0.5 rounded-sm hover:text-destructive focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none"
          >
            <X className="size-3" aria-hidden />
          </button>
        </span>
      ))}
      <input
        ref={inputRef}
        id={id}
        type="email"
        inputMode="email"
        value={inputVal}
        onChange={(e) => { setInputVal(e.target.value); if (inputError) setInputError(null) }}
        onKeyDown={handleKeyDown}
        onBlur={() => { if (inputVal.trim()) tryAdd(inputVal) }}
        disabled={disabled}
        placeholder={value.length === 0 ? "type email, press Enter or comma" : ""}
        aria-label="Add recipient email"
        aria-invalid={Boolean(error || inputError) || undefined}
        className="min-w-[160px] flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground/60 disabled:cursor-not-allowed"
      />
      {inputError && <p role="alert" className="w-full text-xs text-destructive mt-0.5">{inputError}</p>}
    </div>
  )
}
```

---

### `src/components/admin/regions/CreateRegionDialog.tsx` (~200 lines)

Manual form pattern (NO react-hook-form/zod). Key points:

```ts
const EMPTY: CreateRegionInput = { name: "", emails: [], active: true }

interface FieldErrors { name?: string; emails?: string }
```

Submit handler: `createRegion(trimmed)` → `toast.success("Region created.")` → `handleOpenChange(false)` → `onSubmitted()`.

Name conflict detection: if error message includes "name", set as `fieldErrors.name`.

`handleOpenChange`: prevent close while `isLoading`; reset `form`, `fieldErrors`, `apiError` on close.

Dialog size: `sm:max-w-md` (wider than user dialog `sm:max-w-sm` — chip input needs room).

API error banner:
```tsx
<div aria-live="polite">
  {apiError && (
    <div role="alert" className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
      <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span>{apiError}</span>
    </div>
  )}
</div>
```

Active switch wrapper:
```tsx
<div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2.5">
  <div className="flex flex-col gap-0.5">
    <Label htmlFor="cr-active" className="text-sm font-medium leading-snug">Active</Label>
    <span className="text-xs text-muted-foreground">Inactive regions are excluded from notification dispatch.</span>
  </div>
  <Switch id="cr-active" checked={form.active} onCheckedChange={(checked) => patch({ active: checked })} disabled={isLoading} aria-label="Region active status" />
</div>
```

Submit button: `<Spinner />` + "Creating…" while `isLoading`.

---

### `src/components/admin/regions/EditRegionDialog.tsx` (~190 lines)

Same structure as Create. Key differences:

Re-seed on open without `useEffect` (derive at render):
```ts
const seedKey = open && region ? region.id : null
const [seededKey, setSeededKey] = useState<string | null>(null)
if (seedKey !== seededKey) {
  setSeededKey(seedKey)
  if (open && region) {
    setForm({ name: region.name, emails: [...region.emails], active: region.active })
    setFieldErrors({})
    setApiError(null)
  }
}
```

Build delta before API call (send only changed fields):
```ts
const input: UpdateRegionInput = {}
if (form.name.trim() !== region.name) input.name = form.name.trim()
if (JSON.stringify(form.emails) !== JSON.stringify(region.emails)) input.emails = form.emails
if (form.active !== region.active) input.active = form.active
if (Object.keys(input).length === 0) { onOpenChange(false); return }
```

`onSubmitted: () => void` — always triggers `actions.refetch()` (no optimistic update).

---

### `src/components/admin/regions/ViewRegionSheet.tsx` (~170 lines)

Analog: `ViewUserSheet.tsx`. Key differences:
- Header uses `MapPin` icon chip instead of initials avatar
- Recipients section renders email list (one per line, `font-mono text-xs text-muted-foreground`)
- Timestamps use `formatTs(iso: string | null): string` (copy verbatim from `ViewUserSheet`)

Header area:
```tsx
<div aria-hidden className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
  <MapPin className="h-5 w-5" />
</div>
```

Section order: Identity (Name, Status badge, Region ID) → Recipients (emails or "No recipients") → Timestamps (Created, Updated).

`SheetContent` class: `"flex flex-col gap-0 p-0 sm:max-w-md"` (exact from `ViewUserSheet`).

Recipients list:
```tsx
{region.emails.length === 0 ? (
  <span className="italic text-muted-foreground">No recipients</span>
) : (
  <ul className="flex flex-col gap-1">
    {region.emails.map((email) => (
      <li key={email} className="font-mono text-xs text-muted-foreground break-all">{email}</li>
    ))}
  </ul>
)}
```

---

### `src/components/admin/regions/ConfirmActionDialog.tsx`

**Decision: use the shared `users/ConfirmActionDialog` extended with region variants.**

Edit `src/components/admin/users/ConfirmActionDialog.tsx` — add to `VARIANT_CONFIG`:
```ts
activate: {
  icon: "✅",
  iconBg: "bg-emerald-500/10",
  title: "Activate region",
  description: (label: string) =>
    `"${label}" will be marked active and included in notification dispatch.`,
  confirmLabel: "Activate",
  confirmVariant: "default" as const,
},
deactivate: {
  icon: "🚫",
  iconBg: "bg-amber-500/10",
  title: "Deactivate region",
  description: (label: string) =>
    `"${label}" will be excluded from notification dispatch. You can reactivate it at any time.`,
  confirmLabel: "Deactivate",
  confirmVariant: "destructive" as const,
},
```

Edit `src/types/admin/user-ui.ts` — extend `ConfirmActionVariant`:
```ts
export type ConfirmActionVariant = "delete" | "enable" | "disable" | "activate" | "deactivate"
```

**Both files must be edited in one pass by the same agent** — they must stay in sync.

Usage in `RegionManagementPage`:
```tsx
import { ConfirmActionDialog } from "@/components/admin/users/ConfirmActionDialog"
```

---

### `src/components/admin/regions/hooks/useRegionMutations.ts` (~80 lines)

```ts
import { useCallback } from "react"
import { toast } from "sonner"
import { removeRegion } from "@/api/admin/regions/remove"
import { updateRegion } from "@/api/admin/regions/update"
import type { Region } from "@/types/admin/region"

interface MutationDeps { closeDialog: () => void; refetch: () => void }
export interface RegionMutationActions {
  remove: (id: string) => Promise<void>
  toggleActive: (region: Region) => Promise<void>
}

export function useRegionMutations({ closeDialog, refetch }: MutationDeps): RegionMutationActions {
  const afterMutation = useCallback((msg: string) => {
    toast.success(msg); closeDialog(); refetch()
  }, [closeDialog, refetch])

  const handleError = useCallback((err: unknown, fallback: string) => {
    toast.error(err instanceof Error ? (err.message || fallback) : fallback)
  }, [])

  const remove = useCallback(async (id: string) => {
    try { await removeRegion(id); afterMutation("Region deleted.") }
    catch (err) { handleError(err, "Failed to delete region.") }
  }, [afterMutation, handleError])

  const toggleActive = useCallback(async (region: Region) => {
    const nextActive = !region.active
    try {
      await updateRegion(region.id, { active: nextActive })
      afterMutation(nextActive ? "Region activated." : "Region deactivated.")
    } catch (err) { handleError(err, "Failed to update region status.") }
  }, [afterMutation, handleError])

  return { remove, toggleActive }
}
```

---

### `src/components/admin/regions/hooks/useRegionManagement.ts` (~130 lines)

```ts
import { useCallback, useEffect, useRef, useState } from "react"
import { listRegions } from "@/api/admin/regions/list"
import { useRegionMutations } from "./useRegionMutations"
import type { Region, RegionSortBy, RegionListQuery } from "@/types/admin/region"
import type { PaginationMeta } from "@/types/api/envelope"
import type {
  RegionDialogState, RegionQueryState, UseRegionManagementResult
} from "@/types/admin/region-ui"

const DEFAULT_QUERY: RegionQueryState = {
  page: 1, limit: 20, sortBy: "created_at", sortOrder: "desc", q: "", active: "all",
}

export function useRegionManagement(): UseRegionManagementResult {
  const [query, setQuery] = useState<RegionQueryState>(DEFAULT_QUERY)
  const [rows, setRows] = useState<Region[]>([])
  const [meta, setMeta] = useState<PaginationMeta | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dialog, setDialog] = useState<RegionDialogState>({ type: "none" })
  const fetchIdRef = useRef(0)

  const doFetch = useCallback(async (q: RegionQueryState) => {
    const id = ++fetchIdRef.current
    setLoading(true); setError(null)
    try {
      const params: RegionListQuery = {
        page: q.page, limit: q.limit, sortBy: q.sortBy, sortOrder: q.sortOrder,
        ...(q.q ? { q: q.q } : {}),
        ...(q.active !== "all" ? { active: q.active } : {}),
      }
      const result = await listRegions(params)
      if (id !== fetchIdRef.current) return
      setRows(result.data); setMeta(result.meta)
    } catch {
      if (id !== fetchIdRef.current) return
      setError("Failed to load regions. Please try again.")
    } finally {
      if (id === fetchIdRef.current) setLoading(false)
    }
  }, [])

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { void doFetch(query) }, [doFetch, query])

  const setPage     = useCallback((page: number) =>  setQuery((q) => ({ ...q, page })), [])
  const setLimit    = useCallback((limit: number) => setQuery((q) => ({ ...q, limit, page: 1 })), [])
  const setSort     = useCallback((sortBy: RegionSortBy, sortOrder: "asc" | "desc") =>
                        setQuery((q) => ({ ...q, sortBy, sortOrder, page: 1 })), [])
  const setSearch   = useCallback((s: string) =>      setQuery((q) => ({ ...q, q: s, page: 1 })), [])
  const setActive   = useCallback((active: boolean | "all") =>
                        setQuery((q) => ({ ...q, active, page: 1 })), [])
  const refetch     = useCallback(() => setQuery((q) => ({ ...q })), [])
  const openDialog  = useCallback((d: RegionDialogState) => setDialog(d), [])
  const closeDialog = useCallback(() => setDialog({ type: "none" }), [])

  const mutations = useRegionMutations({ closeDialog, refetch })

  return {
    query, setPage, setLimit, setSort, setSearch, setActive,
    rows, meta, loading, error,
    dialog, openDialog, closeDialog,
    actions: { refetch, ...mutations },
  }
}
```

---

### `src/pages/admin/regions/index.tsx`

```tsx
import { MapPin } from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { useRegionManagement } from "@/components/admin/regions/hooks/useRegionManagement"
import { RegionTableToolbar } from "@/components/admin/regions/RegionTableToolbar"
import { RegionTable } from "@/components/admin/regions/RegionTable"
import { RegionTablePagination } from "@/components/admin/regions/RegionTablePagination"
import { CreateRegionDialog } from "@/components/admin/regions/CreateRegionDialog"
import { EditRegionDialog } from "@/components/admin/regions/EditRegionDialog"
import { ViewRegionSheet } from "@/components/admin/regions/ViewRegionSheet"
import { ConfirmActionDialog } from "@/components/admin/users/ConfirmActionDialog"
import type { RegionListQuery, RegionSortBy } from "@/types/admin/region"

export function RegionManagementPage() {
  const { query, setPage, setLimit, setSort, setSearch, setActive,
          rows, meta, loading, error, dialog, openDialog, closeDialog, actions } = useRegionManagement()

  function handleQueryChange(patch: Partial<RegionListQuery>) {
    if (patch.q      !== undefined) setSearch(patch.q ?? "")
    if (patch.active !== undefined) setActive(patch.active ?? "all")
    if (patch.page   !== undefined) setPage(patch.page)
    if (patch.limit  !== undefined) setLimit(patch.limit)
  }

  function handleSortChange(col: RegionSortBy) {
    const nextOrder = query.sortBy === col && query.sortOrder === "asc" ? "desc" : "asc"
    setSort(col, nextOrder)
  }

  const isCreate        = dialog.type === "create"
  const isView          = dialog.type === "view"
  const isEdit          = dialog.type === "edit"
  const isConfirmDelete = dialog.type === "confirm-delete"
  const isConfirmToggle = dialog.type === "confirm-toggle"

  const dialogRegion =
    dialog.type === "view" || dialog.type === "edit" ||
    dialog.type === "confirm-delete" || dialog.type === "confirm-toggle"
      ? dialog.region : null

  const confirmVariant =
    isConfirmDelete ? "delete" : dialogRegion?.active ? "deactivate" : "activate"

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start gap-3">
        <span aria-hidden className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <MapPin className="size-4" />
        </span>
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">Region Management</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage regional distribution groups and their notification recipients.
          </p>
        </div>
      </div>
      <Separator />
      <RegionTableToolbar query={query} onQueryChange={handleQueryChange} onCreate={() => openDialog({ type: "create" })} />
      <RegionTable rows={rows} loading={loading} error={error} sortBy={query.sortBy} sortOrder={query.sortOrder}
        onSort={handleSortChange}
        onView={(r)         => openDialog({ type: "view",           region: r })}
        onEdit={(r)         => openDialog({ type: "edit",           region: r })}
        onDelete={(r)       => openDialog({ type: "confirm-delete", region: r })}
        onToggleActive={(r) => openDialog({ type: "confirm-toggle", region: r })}
      />
      <RegionTablePagination meta={meta} isLoading={loading} onPageChange={setPage} onLimitChange={setLimit} />
      <CreateRegionDialog open={isCreate} onOpenChange={(o) => { if (!o) closeDialog() }} onSubmitted={actions.refetch} />
      <ViewRegionSheet open={isView} onOpenChange={(o) => { if (!o) closeDialog() }} region={isView ? dialog.region : null} />
      <EditRegionDialog open={isEdit} onOpenChange={(o) => { if (!o) closeDialog() }}
        region={isEdit ? dialog.region : null}
        onSubmitted={() => { closeDialog(); actions.refetch() }}
      />
      <ConfirmActionDialog
        open={isConfirmDelete || isConfirmToggle}
        onOpenChange={(o) => { if (!o) closeDialog() }}
        variant={confirmVariant}
        targetLabel={dialogRegion?.name ?? ""}
        onConfirm={() => {
          if (!dialogRegion) return
          if (isConfirmDelete) void actions.remove(dialogRegion.id)
          if (isConfirmToggle) void actions.toggleActive(dialogRegion)
        }}
      />
    </div>
  )
}
```

---

## WIRING EDITS — FRONTEND (one agent, sequential)

### `src/components/layout/nav-items.ts`

Line 2 — import change:
```ts
// Before:
import { LayoutDashboard, ScrollText, UsersRound } from "lucide-react"
// After:
import { LayoutDashboard, MapPin, ScrollText, UsersRound } from "lucide-react"
```

`ADMIN_NAV_ITEMS` — append:
```ts
export const ADMIN_NAV_ITEMS: NavItem[] = [
  { label: "User Management",  to: "/admin/users",        icon: UsersRound },
  { label: "Audit Logs",       to: "/admin/audit-logs",   icon: ScrollText },
  { label: "Region Management",to: "/admin/regions",      icon: MapPin },
]
```

Note: `titleForPath` in same file uses `find` over `[...NAV_ITEMS, ...ADMIN_NAV_ITEMS]` — no additional edit needed. `AppSidebar` iterates `ADMIN_NAV_ITEMS` wholesale — no edit needed there.

### `src/App.tsx`

Add import:
```tsx
import { RegionManagementPage } from "@/pages/admin/regions"
```

Add route inside `<Route element={<AdminRoute />}>`:
```tsx
<Route path="/admin/regions" element={<RegionManagementPage />} />
```

### `src/types/admin/audit-log.ts`

Add `| "regions"` to `AuditCategory` union (exact position: after `"security"`).

### `src/components/admin/audit-logs/AuditCategoryBadge.tsx`

Add to `CATEGORY_MAP`:
```ts
regions: {
  label: "Regions",
  className:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400",
},
```

Color chosen: **emerald** — unused by existing categories (http=slate, auth=indigo, admin=violet, data=teal, system=sky, cron=amber, security=red). Outline badge style does not clash with solid `RegionActiveBadge` (which is solid `bg-emerald-600`).

### `src/components/admin/audit-logs/AuditLogToolbar.tsx`

```ts
// Before:
const STATIC_CATEGORIES: AuditCategory[] = [
  "http", "auth", "admin", "data", "system", "cron", "security",
]
// After:
const STATIC_CATEGORIES: AuditCategory[] = [
  "http", "auth", "admin", "data", "system", "cron", "security", "regions",
]
```

Note: `useAuditLogs.ts` does NOT need changes — it only forwards backend facets.

### `src/types/admin/user-ui.ts` + `src/components/admin/users/ConfirmActionDialog.tsx`

(Must be done together in one pass — described in ConfirmActionDialog section above.)

---

## UI/UX DESIGN SPEC (verbatim-quality)

### Page header — exact markup
```tsx
<div className="flex items-start gap-3">
  <span aria-hidden className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
    <MapPin className="size-4" />
  </span>
  <div>
    <h2 className="text-xl font-semibold tracking-tight text-foreground">Region Management</h2>
    <p className="text-sm text-muted-foreground mt-0.5">
      Manage regional distribution groups and their notification recipients.
    </p>
  </div>
</div>
<Separator />
```

### Active badge
- Active: `<Badge className="bg-emerald-600 text-white dark:bg-emerald-700 border-transparent">Active</Badge>`
- Inactive: `<Badge variant="outline" className="text-muted-foreground">Inactive</Badge>`
- White on emerald-600 = ~4.8:1 (passes AA).

### Email chips in table
- `font-mono text-xs text-muted-foreground rounded bg-muted px-1.5 py-0.5`
- Show first 3; "+N more" badge for overflow; `—` muted when empty.
- `text-muted-foreground` on `bg-muted` = ~4.7:1 (passes AA at `text-xs`).

### Email chips in dialog (interactive)
- Container: `min-h-[2.5rem] w-full rounded-md border border-input bg-background px-3 py-2 flex flex-wrap gap-1.5 focus-within:ring-2 focus-within:ring-ring/50`
- Chips: `inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 font-mono text-xs text-muted-foreground`
- Keyboard: Enter or comma → add; Backspace on empty input → remove last; X button per chip
- `role="group" aria-label="Recipient email addresses"` on container
- Each X: `aria-label={`Remove ${email}`}`

### Loading (8 skeleton rows)
- `const SKELETON_ROWS = 8`
- Use shadcn `<Skeleton />` with column-appropriate widths

### Empty state
- `<MapPin className="size-8 opacity-40" aria-hidden />` + "No regions found" + "Adjust the filters or create a new region."
- Tokens: `text-muted-foreground`, `opacity-40`

### Error state
- `role="alert"`, `border-destructive/30 bg-destructive/10 text-destructive`
- `<AlertCircle className="size-4 shrink-0" aria-hidden />`

### Submit button loading
- `<Loader2 className="size-4 animate-spin mr-2" aria-hidden />` + "Saving…" / "Creating…"
- All form inputs `disabled={submitting}`
- `aria-busy="true"` on the button when submitting

### Layout
- Page: `<div className="flex flex-col gap-5">`
- Toolbar items: `gap-2`
- Dialog form fields: `gap-4` between labeled groups

### Tokens — never use raw hex
- Structural: `bg-background`, `bg-card`, `text-foreground`, `text-muted-foreground`, `border-border`, `border-input`, `ring-ring`, `bg-muted`, `bg-primary/10`, `text-primary`, `text-destructive`
- Tailwind color utilities (badges only): always include both light and dark variants: `border-X-200 bg-X-50 text-X-700 dark:border-X-800 dark:bg-X-950/50 dark:text-X-400`

### Accessibility requirements
- `<div role="toolbar" aria-label="Region table filters">` on toolbar
- Sortable `<TableHead>` must have `aria-sort` attribute
- `aria-label` on trigger button: `Actions for ${region.name}`
- `ViewRegionSheet`: `aria-label="Region details"` on `SheetContent`
- `role="alert"` on API error banners; `aria-live="polite"` wrapper
- All dialogs: Radix UI traps focus automatically

---

## AUTH / ADMIN GATING — NO CHANGES NEEDED

`selectIsAdmin` tests `s.auth.user?.role === "admin"`. `toSessionUser` maps `AuthUser.isAdmin: boolean` → `role: "admin" | "user"`. `AdminRoute` uses `<Outlet />` — adding child `<Route>` is all that is needed. `AppSidebar` iterates `ADMIN_NAV_ITEMS` — appending the new entry is sufficient. Region Management is a pure additive extension.

---

## VERIFICATION CHECKLIST

Backend:
- `cd backend && ./.venv/bin/python -c "import app.main"` imports clean
- Unauthenticated `GET /admin/regions` → 401
- Create → list → get → update → delete happy path returns correct envelopes
- `?sortBy=bogus` or unknown query key → 422/400
- Mutation writes `audit_logs` doc with `category="regions"`, `action="region.created"`, actor email set
- All new backend files ≤250 lines

Frontend:
- `cd frontend && npm run build` green (tsc -b && vite build)
- `npm run lint` clean for new files
- Region Management nav item visible to admins only; route guarded by `AdminRoute`
- `"regions"` appears in Audit Logs category filter with emerald badge
- All new frontend files ≤250 lines

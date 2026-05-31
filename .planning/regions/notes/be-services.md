# Backend Service Layer — Region Management Implementation Notes

> Source of truth for the coding agent. All patterns are derived from reading
> actual source files. Do not invent symbols not listed here.

---

## 0. Key imports used throughout

```python
from __future__ import annotations
import re
from math import ceil
from datetime import datetime, timezone
from typing import Any
from beanie import PydanticObjectId
from ...core.errors import ConflictError, NotFoundError
from ...core.responses import PaginationMeta
from ...models.region import Region
from ...schemas.region import (
    RegionCreate, RegionListQuery, RegionOptionsQuery,
    RegionOption, RegionPublic, RegionUpdate,
)
from ...utils.region.query import build_region_filter, build_sort
from ..audit.events import audit_region_event
```

---

## 1. `_now_utc()` helper — mirror audit_log.py exactly

File: `backend/app/models/region.py`

```python
from datetime import datetime, timezone

def _now_utc() -> datetime:
    return datetime.now(timezone.utc)
```

This is identical to `models/audit_log.py` line 22. Use `Field(default_factory=_now_utc)` for
`created_at` and `updated_at`.

`AuditCategory` Literal in `models/audit_log.py` line 17 is currently:
```python
AuditCategory = Literal["http", "auth", "admin", "data", "system", "cron", "security"]
```
**Wiring agent must append `"regions"` to this Literal** (and mirror in `schemas/audit_log.py`
and `services/audit_log/options.py::_CATEGORIES`).

---

## 2. `PaginationMeta` construction — exact math

Source: `services/user/list.py` lines 30-37 and `services/audit_log/list.py` lines 44-51.

```python
meta = PaginationMeta(
    page=query.page,
    limit=query.limit,
    total=total,
    totalPages=ceil(total / query.limit) if query.limit else 0,
    sortBy=query.sortBy,
    sortOrder=query.sortOrder,
)
```

`PaginationMeta` is imported from `...core.responses` (defined in
`backend/app/core/responses.py` lines 20-28 — fields: `page`, `limit`, `total`,
`totalPages`, `sortBy`, `sortOrder`).

`query.skip` is a `@property` on `PageQuery` (`schemas/common.py` line 24):
`return (self.page - 1) * self.limit`.

---

## 3. `build_region_filter` + `build_sort` — exact pattern

File to create: `backend/app/utils/region/query.py`

Mirror `utils/audit_log/query.py` for sort token; mirror the `$or` pattern from
`utils/audit_log/query.py` lines 43-49 for free-text:

```python
import re
from typing import Any
from ...schemas.region import RegionListQuery

def build_region_filter(query: RegionListQuery) -> dict[str, Any]:
    filt: dict[str, Any] = {}
    if query.q:
        rx = {"$regex": re.escape(query.q), "$options": "i"}
        filt["$or"] = [{"name": rx}, {"emails": rx}]
    if query.active is not None:
        filt["active"] = query.active
    return filt

def build_sort(sort_by: str, sort_order: str) -> str:
    prefix = "+" if sort_order == "asc" else "-"
    return f"{prefix}{sort_by}"
```

Note: `{"emails": rx}` works in MongoDB — `$regex` against an array field matches any
array element. `re.escape` is mandatory (ReDoS guard, OWASP A05) — both existing query
utils apply it.

---

## 4. `list_regions` service — `services/region/list.py`

Full pattern from `services/audit_log/list.py` (most faithful analog):

```python
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

## 5. `get_region` service — PydanticObjectId guard → NotFoundError

Mirror `services/audit_log/get.py` lines 33-42 exactly. The error message must NOT
distinguish a malformed id from a missing doc (no enumeration, OWASP):

```python
from beanie import PydanticObjectId
from ...core.errors import NotFoundError
from ...models.region import Region
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

Same two-step pattern appears in `admin_user/get.py` (line 29-35) and `admin_user/update.py`
(lines 43-47) and `admin_user/delete.py` (lines 45-47). All use bare `except Exception`.

---

## 6. Name uniqueness check — anchored case-insensitive regex

Used in `create_region` (no self-exclusion) and `update_region` (exclude self by `region_id`).

### create — no exclusion needed:
```python
existing = await Region.find_one(
    {"name": {"$regex": f"^{re.escape(data.name)}$", "$options": "i"}}
)
if existing is not None:
    raise ConflictError("A region with this name already exists.")
```

### update — exclude self:
```python
existing = await Region.find_one({
    "name": {"$regex": f"^{re.escape(data.name)}$", "$options": "i"},
    "_id": {"$ne": oid},
})
if existing is not None:
    raise ConflictError("A region with this name already exists.")
```

`ConflictError` is in `core/errors.py` line 46 (`status_code=409`, `code="CONFLICT"`).
The anchors `^...$` ensure exact name match (not substring match).

---

## 7. `create_region` service — full flow

```python
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

`_now_utc` must be imported from `models/region.py` (or re-defined locally — prefer import
to keep one source of truth). Both `created_at` and `updated_at` get the same `now` value.

---

## 8. `update_region` service — exclude_unset + updated_at bump + save

```python
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
        # Uniqueness check excluding self
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

`model_dump(exclude_unset=True)` is the standard Pydantic v2 idiom; `admin_user/update.py`
uses `if payload.name is not None` (manual null-check) but the Region SPEC explicitly calls
for `exclude_unset` semantics, which is cleaner for optional partial updates with `bool`
fields that could legitimately be `False`.

`await doc.save()` — Beanie 2.x persists the full document state. Confirmed via
`admin_user/update.py` line 63.

---

## 9. `delete_region` service

```python
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

Mirrors `admin_user/delete.py` pattern: fetch → guard(s) → `await doc.delete()`. Region has
no self-guard or last-record guard (SPEC is silent; do not invent one).

---

## 10. `serialize.py` — `to_public`

```python
from ...schemas.region import RegionPublic
from typing import TYPE_CHECKING
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

`id=str(doc.id)` — ObjectId never exposed directly. Mirror `audit_log/serialize.py` line 19.
`TYPE_CHECKING` guard for the model import avoids circular import risk (same pattern as
`audit_log/serialize.py` lines 15-17).

---

## 11. `options.py` — `search_region_options`

```python
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

`RegionOptionsQuery.limit` is `Field(default=20, ge=1, le=50)` per SPEC §1.2.

---

## 12. `audit_region_event` helper — add to `services/audit/events.py`

Append to the existing `events.py` (currently 141 lines — adding ~20 lines stays within
250-line limit):

```python
async def audit_region_event(
    action: str,
    summary: str,
    *,
    outcome: str = "success",
    actor_email: str | None = None,
    extra: dict[str, Any] | None = None,
) -> None:
    """Record a Region management event (create / update / delete).

    Args:
        action:      Dot-namespaced: ``"region.created"``, ``"region.updated"``,
                     ``"region.deleted"``.
        summary:     Human-readable one-line description.
        outcome:     Defaults to ``"success"``.
        actor_email: Admin who performed the mutation.
        extra:       Structured context (region_id, changed fields, etc.).
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

Signature matches the existing helpers (`audit_auth_event`, `audit_security_event`) —
keyword-only `outcome`, `actor_email`, `extra`.

---

## 13. Audit actions + human summaries — exact strings

| Action | Summary template | `extra` keys |
|--------|-----------------|--------------|
| `"region.created"` | `f"Created region '{doc.name}'"` | `region_id`, `active`, `recipient_count` |
| `"region.updated"` | `f"Updated region '{doc.name}'"` | `region_id`, `changed` (list of field names) |
| `"region.deleted"` | `f"Deleted region '{name}'"` | `region_id`, `name` |

`source="service"` for all three (matches `audit_auth_event` and `audit_security_event`).
`outcome` defaults to `"success"` (only pass `"error"` if a retry/rollback scenario arises —
not applicable here since mutations either succeed or raise before the audit call).

---

## 14. Controller — unknown-key rejection pattern

Exact pattern from `controllers/audit_log.py` lines 50-54:

```python
unknown = set(request.query_params.keys()) - _ALLOWED_LIST_KEYS
if unknown:
    raise ValidationError(
        f"Unknown query parameter(s): {', '.join(sorted(unknown))}"
    )
```

`ValidationError` is `core.errors.ValidationError` (`status_code=400`, `code="VALIDATION_ERROR"`).

Controller function signatures (note `_admin` naming convention from `audit_log.py`):

```python
async def list_regions_controller(
    request: Request,
    query: RegionListQuery = Depends(),
    _admin: AuthUser = Depends(get_current_admin),
) -> SuccessEnvelope[list[RegionPublic]]:

async def region_options_controller(
    request: Request,
    query: RegionOptionsQuery = Depends(),
    _admin: AuthUser = Depends(get_current_admin),
) -> SuccessEnvelope[list[RegionOption]]:

async def create_region_controller(
    body: RegionCreate,
    _admin: AuthUser = Depends(get_current_admin),
) -> SuccessEnvelope[RegionPublic]:
    # actor_email = _admin.emailid  (AuthUser.emailid confirmed in schemas/auth.py line 23)

async def get_region_controller(
    region_id: str,
    _admin: AuthUser = Depends(get_current_admin),
) -> SuccessEnvelope[RegionPublic]:

async def update_region_controller(
    region_id: str,
    body: RegionUpdate,
    _admin: AuthUser = Depends(get_current_admin),
) -> SuccessEnvelope[RegionPublic]:

async def delete_region_controller(
    region_id: str,
    _admin: AuthUser = Depends(get_current_admin),
) -> SuccessEnvelope[None]:
```

`AuthUser.emailid` is a plain `EmailStr` field (`schemas/auth.py` line 23) — confirmed.
Use `actor_email=_admin.emailid` in all three mutation controllers.

Message strings: `"Region created"`, `"Region updated"`, `"Region deleted"` (per SPEC §1.5).
Delete returns `success(None, message="Region deleted")`.

---

## 15. Routes — registration order constraint

Literal paths BEFORE `/{region_id}` is mandatory. Confirmed via `routes/audit_log.py`
lines 43-45 comment and `routes/admin_user.py` (same guard). `/options` must be the first
`add_api_route` after the collection-level `GET ""`.

```python
router = APIRouter(
    prefix="/admin/regions",
    tags=["admin-regions"],
    dependencies=[Depends(get_current_admin)],
)
router.add_api_route("",           ctrl.list_regions_controller,   methods=["GET"],
                     response_model=SuccessEnvelope[list[RegionPublic]])
router.add_api_route("/options",   ctrl.region_options_controller, methods=["GET"],
                     response_model=SuccessEnvelope[list[RegionOption]])
router.add_api_route("",           ctrl.create_region_controller,  methods=["POST"],
                     status_code=201, response_model=SuccessEnvelope[RegionPublic])
router.add_api_route("/{region_id}", ctrl.get_region_controller,    methods=["GET"],
                     response_model=SuccessEnvelope[RegionPublic])
router.add_api_route("/{region_id}", ctrl.update_region_controller, methods=["PATCH"],
                     response_model=SuccessEnvelope[RegionPublic])
router.add_api_route("/{region_id}", ctrl.delete_region_controller, methods=["DELETE"],
                     response_model=SuccessEnvelope[None])
```

---

## 16. Wiring edits — exact lines to add

These three files are edited by ONE wiring agent (never in parallel per SPEC §1.8):

### `backend/app/models/__init__.py`
```python
# Current: from .audit_log import AuditLog; from .user import User; __all__ = ["User", "AuditLog"]
# Add:
from .region import Region
__all__ = ["User", "AuditLog", "Region"]
```

### `backend/app/core/database.py`
```python
# Current line 16: from ..models import AuditLog, User
# Change to:
from ..models import AuditLog, Region, User
# Current line 21: DOCUMENT_MODELS = [User, AuditLog]
# Change to:
DOCUMENT_MODELS = [User, AuditLog, Region]
```

### `backend/app/routes/__init__.py`
```python
# Current line 7: from . import admin_user, audit_log, auth, meta, user
# Change to:
from . import admin_user, audit_log, auth, meta, region, user
# Add after audit_log include:
api_router.include_router(region.router)
```

### `backend/app/models/audit_log.py` (AuditCategory Literal, line 17)
```python
# Current:
AuditCategory = Literal["http", "auth", "admin", "data", "system", "cron", "security"]
# Change to:
AuditCategory = Literal["http", "auth", "admin", "data", "system", "cron", "security", "regions"]
```

### `backend/app/schemas/audit_log.py`
Add `"regions"` to `AuditCategory` Literal (same change, different file — must stay in sync).

### `backend/app/services/audit_log/options.py` line 28
```python
# Current:
_CATEGORIES: list[str] = ["http", "auth", "admin", "data", "system", "cron", "security"]
# Change to:
_CATEGORIES: list[str] = ["http", "auth", "admin", "data", "system", "cron", "security", "regions"]
```

---

## 17. File tree for new service domain

```
backend/app/
  models/region.py                    (NEW)
  schemas/region.py                   (NEW)
  utils/region/__init__.py            (NEW, empty)
  utils/region/query.py               (NEW)
  services/region/__init__.py         (NEW, empty)
  services/region/serialize.py        (NEW)
  services/region/list.py             (NEW)
  services/region/get.py              (NEW)
  services/region/create.py           (NEW)
  services/region/update.py           (NEW)
  services/region/delete.py           (NEW)
  services/region/options.py          (NEW)
  controllers/region.py               (NEW)
  routes/region.py                    (NEW)
```

Existing files edited (wiring agent only):
- `models/__init__.py`
- `core/database.py`
- `routes/__init__.py`
- `models/audit_log.py` (AuditCategory Literal)
- `schemas/audit_log.py` (AuditCategory Literal — verify location)
- `services/audit_log/options.py` (_CATEGORIES list)
- `services/audit/events.py` (append audit_region_event)

---

## 18. No BLOCKERs against SPEC

All patterns in the SPEC match observed codebase conventions:
- `PydanticObjectId` guard → `NotFoundError` pattern: confirmed exact.
- `math.ceil` for `totalPages`: confirmed exact.
- `build_sort` returning `"+field"` / `"-field"` token: confirmed exact.
- `await doc.save()` for updates: confirmed exact (Beanie 2.x).
- `await doc.insert()` for creates: confirmed exact.
- `await doc.delete()` for deletes: confirmed exact.
- `AuthUser.emailid` (not `.email`): confirmed at `schemas/auth.py` line 23.
- `record_audit(source="service", ...)` for service-layer audit calls: confirmed.
- `_CATEGORIES` list in `options.py` is a plain Python list (not derived from model Literal):
  confirmed — it must be updated manually in sync with the Literal.

# Backend Model + Schema Notes — Region Domain

> Area: `models/region.py` + `schemas/region.py`
> Source files read: `models/audit_log.py`, `models/user.py`,
> `schemas/admin_user.py`, `schemas/common.py`, `schemas/audit_log.py`,
> `controllers/audit_log.py`, `controllers/admin_user.py`,
> `routes/audit_log.py`, `services/audit_log/get.py`,
> `services/admin_user/list.py`, `services/audit/events.py`,
> `core/errors.py`, `core/responses.py`, `core/database.py`,
> `core/auth_deps.py`, `utils/audit_log/query.py`.

---

## 1. `backend/app/models/region.py`

### Exact imports to use

```python
from __future__ import annotations

from datetime import datetime, timezone
from typing import Annotated

from beanie import Document, Indexed
from pydantic import Field
```

`_now_utc` is defined identically to `models/audit_log.py` (line 22-24):

```python
def _now_utc() -> datetime:
    return datetime.now(timezone.utc)
```

### Index style — `Annotated[T, Indexed()]`

`audit_log.py` uses `Annotated[T, Indexed()]` inline on every indexed field (no
`Settings.indexes` list). Use the same style for Region:

```python
name:       Annotated[str, Indexed()]
active:     Annotated[bool, Indexed()]
created_at: Annotated[datetime, Indexed()] = Field(default_factory=_now_utc)
```

`emails` is NOT indexed (SPEC §1.1). `updated_at` is NOT indexed (SPEC §1.1).

`user.py` shows `Indexed(unique=True)` on `emailid` — for Region, `name` gets
plain `Indexed()` (no `unique=True`); uniqueness is enforced by a case-insensitive
regex check in the create/update service (see SPEC §1.4).

### Full class skeleton

```python
class Region(Document):
    name:       Annotated[str, Indexed()]
    emails:     list[str] = Field(default_factory=list)
    active:     Annotated[bool, Indexed()] = True
    created_at: Annotated[datetime, Indexed()] = Field(default_factory=_now_utc)
    updated_at: datetime = Field(default_factory=_now_utc)

    class Settings:
        name = "regions"
```

No `__all__` in model files (none exists in `audit_log.py` or `user.py`).

### Wiring — `models/__init__.py` and `core/database.py`

Current `models/__init__.py` (lines 1-6):
```python
from .audit_log import AuditLog
from .user import User
__all__ = ["User", "AuditLog"]
```
Add: `from .region import Region` and `"Region"` to `__all__`.

Current `core/database.py` line 21: `DOCUMENT_MODELS = [User, AuditLog]`
Add import `from ..models import AuditLog, Region, User` (or extend the existing
import), append `Region` to `DOCUMENT_MODELS`.

---

## 2. `backend/app/schemas/region.py`

### Imports

```python
from __future__ import annotations

import re
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator

from .common import PageQuery
```

`EmailStr` is used in `schemas/admin_user.py` (line 13) and `schemas/auth.py` for
input validation. `email-validator 2.3.0` is installed (confirmed in
`backend/CLAUDE.md`).

### `RegionSortBy`

```python
RegionSortBy = Literal["name", "active", "created_at", "updated_at"]
```

Mirrors `AuditSortBy` (Literal type alias at module level, not a class).

### `RegionListQuery`

```python
class RegionListQuery(PageQuery):
    sortBy: RegionSortBy = "created_at"
    # sortOrder inherited from PageQuery (default "desc")
    q: str | None = Field(default=None, max_length=200)
    active: bool | None = None   # FastAPI coerces ?active=true/false automatically
```

`PageQuery` (from `schemas/common.py`) provides: `page=1`, `limit=20 (max 100)`,
`sortOrder="desc"`, `skip` property.

### `RegionOptionsQuery`

```python
class RegionOptionsQuery(BaseModel):
    q: str | None = Field(default=None, max_length=200)
    limit: int = Field(default=20, ge=1, le=50)
```

SPEC caps at 50. Compare `UserOptionsQuery` (default=50, le=200) and
`AuditOptionsQuery` (default=50, le=200) — Region's is stricter per SPEC §1.2.

### Pydantic v2 validator style — what this codebase uses

**No validators exist yet in any existing schema file.** The existing schemas use
`Field(min_length=..., max_length=...)` constraints only (e.g. `admin_user.py`
lines 96, 108, 120). The SPEC calls for `field_validator` / `model_validator`
(pydantic v2 style). Use the standard pydantic v2 decorator pattern:

```python
# field_validator — runs per-field, mode="before" to transform input
@field_validator("name", mode="before")
@classmethod
def strip_name(cls, v: str | None) -> str | None:
    if isinstance(v, str):
        return v.strip()
    return v

# field_validator for emails list — lowercase + dedupe + cap
@field_validator("emails", mode="before")
@classmethod
def normalize_emails(cls, v: list | None) -> list:
    if not v:
        return []
    seen = []
    seen_set: set[str] = set()
    for email in v:
        normalized = str(email).lower().strip()
        if normalized not in seen_set:
            seen_set.add(normalized)
            seen.append(normalized)
    if len(seen) > 100:
        from ..core.errors import ValidationError as AppValidationError
        raise ValueError("emails list exceeds maximum of 100 recipients")
    return seen
```

**Important:** `EmailStr` validation happens AFTER `mode="before"` validators in
pydantic v2. So lowercasing in `mode="before"` runs before pydantic validates each
element as `EmailStr`. The returned list from the validator will be re-validated by
pydantic as `list[EmailStr]`.

**Cap enforcement:** raise `ValueError` (not `AppError`) inside validators — pydantic
wraps it into a `ValidationError` which FastAPI converts to a 422. The message
becomes `details` in the error envelope via the centralized handler.

For `RegionUpdate`, use `model_validator(mode="before")` only if you need
cross-field logic; otherwise individual `field_validator` decorators with
`mode="before"` are sufficient and match pydantic v2 best practice.

### `RegionCreate`

```python
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
```

### `RegionUpdate`

```python
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
```

`model_validator` is NOT needed here — no cross-field logic required.

Use `model_dump(exclude_unset=True)` in the update service to apply only provided
fields (mirrors `UpdateUserRequest` usage in `services/admin_user/update.py`).

### `RegionPublic`

```python
class RegionPublic(BaseModel):
    id: str
    name: str
    emails: list[str]   # declared list[str], NOT list[EmailStr]
    active: bool
    created_at: datetime
    updated_at: datetime
```

**EmailStr serialization:** `EmailStr` in pydantic v2 serializes to `str` natively.
However, `RegionPublic.emails` is declared as `list[str]` (not `list[EmailStr]`)
as specified — this means `to_public()` passes already-normalized strings and there
is no additional pydantic email validation on the outbound DTO. No special
`model_config` or `@field_serializer` is needed.

**`id` field:** cast via `str(doc.id)` in `to_public()` (matches
`to_admin_user_public` at line 161 of `admin_user.py` and `to_detail` in
`audit_log/serialize.py` — both use `str(doc.id)`).

### `RegionOption`

```python
class RegionOption(BaseModel):
    value: str           # str(region.id)
    label: str           # region.name
    sublabel: str | None = None   # e.g. "3 recipient(s) · Active"
```

Shape is identical to `AsyncOption` in `admin_user.py` (lines 128-136) and
`audit_log.py` (lines 133-144). `RegionOption` is a domain-specific class (not
reused from those modules) but has the same three fields.

---

## 3. Audit category wiring (`AuditCategory` Literal)

Two files define `AuditCategory` as a `Literal` and must BOTH be updated:

1. `backend/app/models/audit_log.py` line 17:
   ```python
   AuditCategory = Literal["http", "auth", "admin", "data", "system", "cron", "security"]
   ```
   Add `"regions"` → becomes:
   ```python
   AuditCategory = Literal["http", "auth", "admin", "data", "system", "cron", "security", "regions"]
   ```

2. `backend/app/schemas/audit_log.py` line 22: identical Literal — same change.

3. `backend/app/services/audit_log/options.py` — add `"regions"` to `_CATEGORIES`
   list (inspect this file; `_CATEGORIES` drives the `/facets` endpoint).

4. `backend/app/services/audit/events.py` — add `audit_region_event` helper:
   ```python
   async def audit_region_event(
       action: str,
       summary: str,
       *,
       outcome: str = "success",
       actor_email: str | None = None,
       extra: dict[str, Any] | None = None,
   ) -> None:
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
   Signature mirrors `audit_auth_event` (lines 112-140) and `audit_security_event`.

---

## 4. AuthUser field name confirmation

`core/auth_deps.py` line 28: `return AuthUser(emailid=user.emailid, ...)`.
`schemas/auth.py` line 24: `emailid: EmailStr`.

**SPEC §1.5 says `actor_email=admin.emailid` — CONFIRMED correct.** The dependency
returns `AuthUser`; access via `admin.emailid` (not `.email`).

Controller pattern for mutations (from `controllers/admin_user.py` line 101-103):
```python
async def delete_user_controller(
    user_id: str,
    current_admin: AuthUser = Depends(get_current_admin),
) -> SuccessEnvelope[None]:
    await delete_user(user_id, current_admin.emailid)
```
For audit-emitting controllers, bind the dependency as `current_admin: AuthUser`
(not `_admin`) so `.emailid` is accessible.

---

## 5. `build_sort` pattern

From `utils/audit_log/query.py` lines 91-99 (identical in `utils/admin_user/query.py`):
```python
def build_sort(sort_by: str, sort_order: str) -> str:
    prefix = "+" if sort_order == "asc" else "-"
    return f"{prefix}{sort_by}"
```
Copy this verbatim into `utils/region/query.py`.

---

## 6. Unknown-key rejection pattern

From `controllers/audit_log.py` lines 35-55 (frozenset style):
```python
_ALLOWED_LIST_KEYS = frozenset({
    "page", "limit", "sortBy", "sortOrder",
    "q", "category", ...
})

unknown = set(request.query_params.keys()) - _ALLOWED_LIST_KEYS
if unknown:
    raise ValidationError(
        f"Unknown query parameter(s): {', '.join(sorted(unknown))}"
    )
```
For region controllers, the list controller needs `Request` injected as first param.
`audit_log` controller uses `request: Request` but `admin_user` list controller
also does — both patterns are present. Use `request: Request` first arg.

Note: `admin_user` options controller (line 61-67) does NOT check unknown keys for
the options endpoint, but `audit_log` options controller DOES. SPEC §1.5 requires
both checks. Use the `audit_log` pattern (check both list and options).

---

## 7. `PaginationMeta` construction

From `services/admin_user/list.py` lines 41-49:
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
Import `from math import ceil`. Copy identically in `services/region/list.py`.

---

## 8. Route registration style

From `routes/audit_log.py` lines 27-71 — key rules:
- `router = APIRouter(prefix=..., tags=[...], dependencies=[Depends(get_current_admin)])`
- Use `router.add_api_route(path, controller_fn, methods=[...], response_model=..., summary=...)`
- Literal paths (`""`, `"/options"`) MUST be registered BEFORE `"/{region_id}"`

Region router:
```python
router = APIRouter(
    prefix="/admin/regions",
    tags=["admin-regions"],
    dependencies=[Depends(get_current_admin)],
)
router.add_api_route("",          list_regions_controller,   methods=["GET"],    response_model=SuccessEnvelope[list[RegionPublic]])
router.add_api_route("/options",  region_options_controller, methods=["GET"],    response_model=SuccessEnvelope[list[RegionOption]])
router.add_api_route("",          create_region_controller,  methods=["POST"],   response_model=SuccessEnvelope[RegionPublic], status_code=201)
router.add_api_route("/{region_id}", get_region_controller,    methods=["GET"],  response_model=SuccessEnvelope[RegionPublic])
router.add_api_route("/{region_id}", update_region_controller, methods=["PATCH"], response_model=SuccessEnvelope[RegionPublic])
router.add_api_route("/{region_id}", delete_region_controller, methods=["DELETE"], response_model=SuccessEnvelope[None])
```

`status_code=201` on create — `audit_log.py` route does not use it, but `admin_user`
route does for POST. Follow SPEC §1.6.

---

## 9. `get_region` (ObjectId guard)

From `services/audit_log/get.py` lines 33-42:
```python
try:
    oid = PydanticObjectId(log_id)
except Exception:
    raise NotFoundError("Audit log not found.")

doc = await AuditLog.get(oid)
if doc is None:
    raise NotFoundError("Audit log not found.")
```
Mirror exactly for `Region`. Import: `from beanie import PydanticObjectId`.
OWASP: same error message for invalid id vs missing doc (no enumeration).

---

## 10. `to_public` helper location

`admin_user.py` puts `to_admin_user_public` inside the schema file (line 154).
`audit_log` puts `to_public` / `to_detail` in a dedicated `services/audit_log/serialize.py`.

SPEC §1.4 says `serialize.py → to_public(doc: Region) -> RegionPublic`. Use the
`audit_log` service-layer pattern (separate `serialize.py`), not the schema-embedded
helper.

---

## 11. Key gotchas / cross-checks

- **`from __future__ import annotations`** is present in ALL existing schema and
  model files — include it.
- **`emails` field type in Region model is `list[str]`** (plain str), not
  `list[EmailStr]`. Beanie stores strings in MongoDB. The schema DTOs
  (`RegionCreate`, `RegionUpdate`) use `list[EmailStr]` for INPUT validation
  only; the model and `RegionPublic` use `list[str]`.
- **`RegionCreate.emails` default**: `Field(default_factory=list)` — NOT `[]`
  (mutable default would be shared across instances).
- **`updated_at` must be bumped manually** in the update service
  (`doc.updated_at = _now_utc()` then `await doc.save()`). The model sets it
  once at creation via `default_factory`; there is no auto-update hook in Beanie.
- **`emails` field on Region model stores normalized strings** (lowercased,
  deduped). The validator in `RegionCreate`/`RegionUpdate` normalizes BEFORE
  pydantic validates as `EmailStr` (mode="before"). The service receives
  already-normalized `list[str]` values from `data.emails` after validation.
- **`AuditCategory` Literal duplication**: the same string `"regions"` must be
  added to BOTH `models/audit_log.py` AND `schemas/audit_log.py`. These are
  intentionally duplicated (see `schemas/audit_log.py` line 19 comment: "keep
  both in sync").
- **No `model_config` needed** in Region schemas. No `ConfigDict(from_attributes=True)`
  is used in any existing schema (they all accept plain constructor args).
- **`re` import** is needed in `utils/region/query.py` for `re.escape()` on the
  `q` filter — same as `utils/audit_log/query.py` line 5.

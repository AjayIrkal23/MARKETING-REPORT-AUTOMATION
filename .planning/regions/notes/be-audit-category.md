# Backend: audit-category integration notes — `regions` category

Reference files read:
- `backend/app/models/audit_log.py` (line 17)
- `backend/app/schemas/audit_log.py` (line 22)
- `backend/app/services/audit_log/options.py` (line 28)
- `backend/app/services/audit/events.py` (full)
- `backend/app/services/audit/record.py` (full)
- `backend/app/middleware/audit.py` (full)
- `backend/app/core/config.py` (lines 76-86)

---

## 1. `AuditCategory` Literal — models/audit_log.py

**File:** `backend/app/models/audit_log.py`, line 17.

Current value:
```python
AuditCategory = Literal["http", "auth", "admin", "data", "system", "cron", "security"]
```

Exact replacement (append `"regions"` as the last entry):
```python
AuditCategory = Literal["http", "auth", "admin", "data", "system", "cron", "security", "regions"]
```

Note: `AuditCategory` is a type alias defined at module top-level. The `AuditLog` document
stores `category` as a plain `str` field (line 45: `category: Annotated[str, Indexed()]`),
so adding to the Literal does NOT require a schema migration. The Literal is used for
type-checking and documentation only at the model layer.

---

## 2. `AuditCategory` Literal — schemas/audit_log.py

**File:** `backend/app/schemas/audit_log.py`, line 22.

Current value:
```python
AuditCategory = Literal["http", "auth", "admin", "data", "system", "cron", "security"]
```

Exact replacement (must stay in sync with models/audit_log.py — the comment on line 18 of
that file says "keep both in sync"):
```python
AuditCategory = Literal["http", "auth", "admin", "data", "system", "cron", "security", "regions"]
```

`AuditCategory` is used in `AuditLogListQuery.category: AuditCategory | None = None` (line 57)
so the `?category=regions` filter param will be accepted once this Literal is updated.

---

## 3. `_CATEGORIES` list — services/audit_log/options.py

**File:** `backend/app/services/audit_log/options.py`, line 28.

Current value:
```python
_CATEGORIES: list[str] = ["http", "auth", "admin", "data", "system", "cron", "security"]
```

Exact replacement:
```python
_CATEGORIES: list[str] = ["http", "auth", "admin", "data", "system", "cron", "security", "regions"]
```

`get_facets()` (lines 102-133) returns `AuditFacets(categories=_CATEGORIES, ...)`. Because
`_CATEGORIES` is the static list consumed verbatim, once this line is updated the `"regions"`
category appears automatically in `GET /admin/audit-logs/facets` → `categories[]` with zero
other changes. No DB query is involved — this is a pure in-memory list.

---

## 4. New helper — services/audit/events.py

**Append** the following function to `backend/app/services/audit/events.py` (after the
existing `audit_auth_event` on line 141, at end-of-file). The signature mirrors
`audit_auth_event` exactly but drops `ip` (regions mutations have no IP context) and uses
`category="regions"`, `source="service"`.

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
        summary:     Human-readable description, e.g. ``"Created region 'West'"`.
        outcome:     ``"success"`` | ``"failure"`` | ``"error"``; defaults to
                     ``"success"``.
        actor_email: Admin actor email threaded from ``admin.emailid``; ``None``
                     if unavailable.
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

**Import note:** `Any` is already imported at line 8 of events.py (`from typing import Any`).
`record_audit` is already imported at line 19 (`from .record import record_audit`). No new
imports needed.

**Actions used by the region services (per SPEC §1.7):**
| Service file          | action string        | extra keys                                        |
|-----------------------|----------------------|---------------------------------------------------|
| services/region/create.py | `"region.created"` | `region_id`, `active`, `recipient_count`        |
| services/region/update.py | `"region.updated"` | `region_id`, `changed` (list of field names)    |
| services/region/delete.py | `"region.deleted"` | `region_id`, `name`                             |

**Import in region service files:**
```python
from ..audit.events import audit_region_event
```

---

## 5. Middleware dual-logging analysis — middleware/audit.py

**File:** `backend/app/middleware/audit.py`, lines 49-54.

The `_category(path)` function is:
```python
def _category(path: str) -> str:
    if path.startswith("/auth"):
        return "auth"
    if path.startswith("/admin"):
        return "admin"
    return "http"
```

All `/admin/regions` requests match `path.startswith("/admin")` and therefore receive
`category="admin"` in the HTTP-layer audit record written by `AuditMiddleware`.

The explicit `await audit_region_event(...)` calls in the region service layer write
a SECOND audit document with `category="regions"`, `source="service"`.

**This dual-logging is expected and acceptable.** Rationale:
- The `"admin"` HTTP record captures the wire-level event (method, path, status, duration,
  IP, request/response bodies) — the same as every other `/admin/*` route.
- The `"regions"` service record captures the domain-level event (what object changed,
  which fields, actor email) — a clean semantic trail filterable by category.
- This is the same dual-logging pattern already used by auth routes: `POST /auth/login`
  writes `category="auth"` from `AuditMiddleware` AND `audit_auth_event(...)` emits a
  second `category="auth"` service record from `services/auth/login.py`. Regions follows
  the same idiom, just with a distinct category value (`"regions"` vs `"admin"`).

**Do NOT add `/admin/regions` to `audit_skip_path_prefixes`.**

Current `audit_skip_path_prefixes` (config.py line 86):
```python
audit_skip_path_prefixes: tuple[str, ...] = ("/admin/audit-logs",)
```
`/admin/audit-logs` is skipped to prevent the audit read API from logging itself into
an infinite loop. `/admin/regions` has no such self-referential risk and must NOT be added.

---

## 6. Sync checklist

These three locations must always contain the same set of category strings. Failure to
update all three will cause mismatches between what `?category=regions` accepts at the API
layer vs what facets returns vs what Pydantic validates.

| Location | Symbol | Required change |
|---|---|---|
| `backend/app/models/audit_log.py:17` | `AuditCategory` Literal | Add `"regions"` |
| `backend/app/schemas/audit_log.py:22` | `AuditCategory` Literal | Add `"regions"` |
| `backend/app/services/audit_log/options.py:28` | `_CATEGORIES` list | Add `"regions"` |

All three are single-line edits appending `"regions"` to the existing set. The `_CATEGORIES`
list in options.py has an explicit comment (line 24-26) saying it "must match the Literal
definitions in the model/schema" — this is the authoritative cross-file sync note already in
the codebase.

---

## 7. No BLOCKER findings

SPEC §1.7 is fully realizable against the real codebase:
- `record_audit` in `record.py` accepts `category: str` (plain string, no validation
  against the Literal) so passing `"regions"` works immediately once the helper exists.
- The middleware `_category()` has no exhaustive match / assert that would reject unknown
  categories — it is a simple if/elif chain returning a plain string.
- `AuditFacets.categories: list[str]` (schemas/audit_log.py line 161) accepts any strings,
  so `_CATEGORIES` can grow without a schema change.
- No circular import risk: `audit_region_event` calls `record_audit` which does a local
  import of `AuditLog` inside its body (record.py line 56: `from ...models import AuditLog`)
  — the same deferred-import pattern already used by all other event helpers.

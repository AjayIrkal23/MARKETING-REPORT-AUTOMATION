# Adding a Backend Domain

Step-by-step recipe for scaffolding a new domain that mirrors the existing `auth` and `user` domains. Governed by skills `scaffold-standards`, `domain-scaffold-patterns`, and `service-layer-standards`.

---

## Build Order

Follow this sequence — each step depends on the previous one being locked.

| Step | What | Why first |
|------|------|-----------|
| 1 | Lock the contract (HTTP method, path, request/response shapes) | Prevents churn in all downstream layers |
| 2 | Add schema (`schemas/<domain>.py`) | Defines the typed surface before any logic |
| 3 | Add service(s) (`services/<domain>/<action>.py`) | Business logic + DB access; transport-free |
| 4 | Add controller (`controllers/<domain>.py`) | Thin: call service, return envelope |
| 5 | Add route + register in `routes/__init__.py` | Wires the endpoint; `api_router.include_router(...)` |
| 6 | Add helpers/mappers (`utils/<domain>/query.py`) | Only if the domain needs filter or sort building |

---

## File Tree

```
backend/app/
  schemas/<domain>.py          # Pydantic DTOs: ListQuery, ItemPublic, CreateBody, …
  services/<domain>/
    list.py                    # paginated listing
    get_by_id.py               # single-item fetch
    create.py                  # insert
    update.py                  # partial update
    delete.py                  # delete + guard
  controllers/<domain>.py      # thin: Depends(query) -> service -> success(...)
  routes/<domain>.py           # APIRouter(prefix="/<domain>", tags=["<domain>"])
  routes/__init__.py           # add: from . import <domain>  +  api_router.include_router(...)
  models/<domain>.py           # Beanie Document (new collection)
  utils/<domain>/query.py      # filter + sort builders (if needed)
```

All files must stay under 250 lines. Split before adding behavior.

---

## Standard Action Set

Implement only what the domain needs; the list and getById shapes below are the minimum for any read-exposed domain.

| Action | HTTP | Path | Service file |
|--------|------|------|--------------|
| list | GET | `/<domain>` | `services/<domain>/list.py` |
| getById | GET | `/<domain>/{id}` | `services/<domain>/get_by_id.py` |
| create | POST | `/<domain>` | `services/<domain>/create.py` |
| update | PATCH | `/<domain>/{id}` | `services/<domain>/update.py` |
| delete | DELETE | `/<domain>/{id}` | `services/<domain>/delete.py` |

---

## Layer Rules (from `service-layer-standards`)

**Controllers may:**
- Read already-validated params/body via `Depends()`
- Call one or more services
- Return `success(data, meta=meta)` or raise (let centralized handlers catch)

**Controllers must not:**
- Query the DB directly
- Implement business rules or data transforms

**Services must:**
- Own all DB access (Beanie `Document.find`, `.find_one`, `.save`, `.delete`)
- Raise typed `AppError` subclasses from `core.errors` when business rules fail
- Accept and return plain Python types / Pydantic models — never `Request`, `Response`, or `Depends`

---

## Envelope + Error Contract

Every JSON response uses `core.responses`:

```python
# success — controller
from ..core.responses import success, SuccessEnvelope
return success(items, meta=meta)          # {success, data, message, meta}

# typed error — service
from ..core.errors import NotFoundError
raise NotFoundError("Report not found")   # -> 404 {success:false, error:{code,message,details}}
```

Available typed errors in `core/errors.py`: `ValidationError` (400), `UnauthorizedError` (401), `ForbiddenError` (403), `NotFoundError` (404), `ConflictError` (409).

Never raise raw `Exception` or `HTTPException` in services — the centralized handler in `core/exception_handlers.py` maps `AppError` to the standard error envelope automatically.

---

## Pagination + Sort (list endpoints)

Extend `schemas/common.py:PageQuery` and pin `sortBy` to a `Literal` of the actual model fields.

```python
# schemas/report.py
from typing import Literal
from .common import PageQuery

ReportSortBy = Literal["createdAt", "customerId", "status"]  # whitelist only real fields

class ReportListQuery(PageQuery):
    sortBy: ReportSortBy = "createdAt"
    sortOrder: Literal["asc", "desc"] = "desc"
    q: str | None = None
```

`PageQuery` already enforces `page>=1`, `limit` in `[1, 100]` (default 20), and exposes `.skip`.

Build Beanie sort tokens in a `utils/<domain>/query.py` helper (see `utils/user/query.py` for the pattern):

```python
def build_sort(sort_by: str, sort_order: str) -> str:
    return f"{'+' if sort_order == 'asc' else '-'}{sort_by}"
```

Return `PaginationMeta`-compatible dict from the service; pass it as `meta=` to `success()`:

```python
meta = {
    "page": query.page, "limit": query.limit,
    "total": total, "totalPages": ceil(total / query.limit),
    "sortBy": query.sortBy, "sortOrder": query.sortOrder,
}
return items, meta
```

---

## Worked Example: `report` Domain

Concrete file list for a hypothetical `GET /reports` (paginated list) + `POST /reports` (create):

```
backend/app/
  models/report.py                  # class Report(Document): Settings.name = "reports"
  schemas/report.py                  # ReportListQuery(PageQuery), ReportPublic, ReportCreateBody
  services/report/
    list.py                          # async def list_reports(query) -> tuple[list[ReportPublic], dict]
    create.py                        # async def create_report(body) -> ReportPublic
  controllers/report.py              # list_reports_controller, create_report_controller
  routes/report.py                   # APIRouter(prefix="/reports", tags=["reports"])
  routes/__init__.py                 # + from . import report; api_router.include_router(report.router)
  utils/report/query.py              # build_report_filter, build_sort  (if q-search needed)
```

**`routes/__init__.py` diff — the only global file touched:**

```python
from . import auth, meta, report, user   # add report

api_router.include_router(report.router) # add after existing includes
```

**Beanie model snippet:**

```python
from beanie import Document, Indexed
from typing import Annotated
from datetime import datetime

class Report(Document):
    customerId: Annotated[str, Indexed()]
    status: str = "pending"
    createdAt: datetime

    class Settings:
        name = "reports"
```

Register the new Document in `core/database.py` where `init_beanie` receives its document list (mirror how `User` is registered there).

---

## Checklist

Before marking a new domain complete:

- [ ] Response envelope: `success()` used in every controller; no naked `dict` returns
- [ ] Error handling: services raise typed `AppError` subclasses only; no `raise HTTPException`
- [ ] List endpoint: `sortBy` is a `Literal` of real model fields; unknown keys rejected by Pydantic; `maxLimit=100` via `PageQuery`
- [ ] Pagination meta: `{page, limit, total, totalPages, sortBy, sortOrder}` in `meta` field
- [ ] File size: every new file <= 250 lines; split if approaching limit
- [ ] Services own DB: no Beanie calls in controllers or routes
- [ ] New Beanie Document registered in `core/database.py` `init_beanie` call
- [ ] Route registered: `routes/__init__.py` imports module + `api_router.include_router(...)`
- [ ] No `motor` import: Beanie 2.x uses `AsyncMongoClient` (pymongo); Motor is retired
- [ ] Schemas have no internal fields exposed: create a `Public` DTO that excludes hashes / internal flags

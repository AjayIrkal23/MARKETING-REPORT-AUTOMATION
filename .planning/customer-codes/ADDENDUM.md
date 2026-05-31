# Customer Code Management — Phase-1 Audit ADDENDUM

> **Source:** Phase-1 audit findings across 9 audit areas.
> **Purpose:** Concrete resolutions for every blocker. Phase-2 builders MUST read this before touching any file.
> **Reference SPEC:** `.planning/customer-codes/SPEC.md`

---

## Blockers & Resolutions

### Area 1 — Backend schemas/customer_code.py

**BLOCKER 1 — AuditCategory Literal must be updated in BOTH files simultaneously**
Resolution: Add `"customer_codes"` to the Literal in `backend/app/models/audit_log.py` (line 17) AND `backend/app/schemas/audit_log.py` (line 22) in a single commit. Also update `services/audit_log/options.py` `_CATEGORIES` list. All three must stay in sync — a drift between any two causes silent runtime failures.

**BLOCKER 2 — CustomerCodeOption import path**
Resolution: Import `AsyncOption` exclusively from `.admin_user`:
```python
from .admin_user import AsyncOption
CustomerCodeOption = AsyncOption  # type alias, no new class
```
Do NOT import from `.audit_log` — identical shape but wrong dependency direction.

**BLOCKER 3 — RegionOption vs AsyncOption confusion**
Resolution: `CustomerCodeOption = AsyncOption` (from `.admin_user`). Do NOT import `RegionOption` from `schemas/region.py` — it has the same three fields but is a separate class.

**BLOCKER 4 — region_id is a plain str, not PydanticObjectId**
Resolution: The service layer (`region_link.py`) must validate the string before querying. Catch both invalid hex strings and valid-hex-but-missing documents with the same 400 response to prevent enumeration:
```python
async def resolve_region_or_400(region_id: str) -> Region:
    try:
        oid = PydanticObjectId(region_id)
    except Exception:
        raise ValidationError("Invalid or unknown region.", details={"field": "region_id"})
    doc = await Region.get(oid)
    if doc is None:
        raise ValidationError("Invalid or unknown region.", details={"field": "region_id"})
    return doc
```

**BLOCKER 5 — region_id not covered by strip validator**
Resolution: The `strip_and_normalize` field_validator in `CustomerCodeCreate` and `CustomerCodeUpdate` MUST include `region_id` in its field list. The exact combined validator is given in Builder Notes §schemas below.

**BLOCKER 6 — SAP codes in audit payloads (non-blocking)**
Resolution: No action needed. Per `backend/CLAUDE.md`, bare `code` values are not redacted — this is correct policy. Builders must be aware but must not change redaction behavior.

---

### Area 2 — Service signatures and Beanie 2.x API

**SPEC §2.5 distinct() call — positional arg**
Resolution: Call as `await CustomerCode.distinct(query.field, filt)` — filter as second positional arg, not a keyword arg named `filter`.

**SPEC §2.5 insert_many — obsolete loop-fallback note**
Resolution: `insert_many` IS available in Beanie 2.1.0. Use directly. It returns `InsertManyResult` (pymongo), NOT hydrated docs. Count inserted as `len(docs_list)` after the call — not from the return value.

**SPEC §2.5 update.py — no generic setattr loop**
Resolution: Enumerate each of the 10+ fields explicitly by name in the update block (mirrors `region/update.py`). A generic `setattr` loop risks setting internal Pydantic attributes.

**SPEC §2.8 — _CATEGORIES list**
Resolution: Add `"customer_codes"` to `services/audit_log/options.py` `_CATEGORIES`. This is the third file in the three-file sync contract (models + schemas + options).

---

### Area 3 — Controllers + Routes (SPEC §§2.6–2.7)

**BLOCKER-1 — AuditCategory three-file sync**
See Area 1 BLOCKER 1. Same resolution applies.

**BLOCKER-2 — audit_customer_code_event category string**
Resolution: Use `category="customer_codes"` (NOT `"regions"`, NOT `"customer_code"` singular). The region helper uses `"regions"` — do NOT copy that string.

**BLOCKER-3 — AsyncOption import path**
See Area 1 BLOCKER 2. Same resolution.

**BLOCKER-4 — StreamingResponse route must omit response_model**
Resolution: The `GET /template` route registration MUST NOT include `response_model`. FastAPI will attempt Pydantic serialization on a `StreamingResponse` if `response_model` is set, causing a runtime error.

**BLOCKER-5 — /options and /template BEFORE /{code_id}**
Resolution: Registration order in `routes/customer_code.py`:
1. `GET ""` — list
2. `GET /options` — literal, must precede `/{code_id}`
3. `GET /template` — literal, must precede `/{code_id}`
4. `POST /import` — literal, must precede `/{code_id}`
5. `POST ""` — create
6. `GET /{code_id}`
7. `PATCH /{code_id}`
8. `DELETE /{code_id}`

**BLOCKER-6 — controllers/customer_code.py line count**
Resolution: If the file exceeds 250 lines, split import + template controllers into `controllers/customer_code_import.py` and register both from the router separately.

---

### Area 4 — Audit taxonomy extension (SPEC §3 steps 5–8)

**Three-file Literal sync**
Resolution: All three edits in a single commit:
1. `models/audit_log.py` line 17 — add `"customer_codes"` to `AuditCategory` Literal
2. `schemas/audit_log.py` line 22 — add `"customer_codes"` to `AuditCategory` Literal
3. `services/audit_log/options.py` line 28 — append `"customer_codes"` to `_CATEGORIES` list

**SPEC section numbering mismatch (non-blocking)**
Resolution: SPEC §3 steps 5–8 map to the four audit taxonomy files. The "§3.5–3.8" label in the audit findings is shorthand only. No functional impact.

**category string asymmetry (non-blocking)**
Resolution: `"regions"` for region events, `"customer_codes"` for customer code events — this intentional asymmetry mirrors the collection name (`customer_codes`). Do NOT use `"customer_code"` singular.

**Frontend AuditCategory union sync**
Resolution: `frontend/src/types/admin/audit-log.ts` AuditCategory union must also be updated to add `| "customer_codes"`. If BE-wire agent handles only backend, FE-wire agent MUST include this edit. Both `AuditCategoryBadge.tsx` and the TS union must be updated together (union first, badge second).

---

### Area 5 — Excel utils / import / template / requirements

**BLOCKER-1 — python-multipart absent**
Resolution: Add `python-multipart==0.0.29` to `backend/requirements.txt` and install before any test of the import endpoint. FastAPI will reject `UploadFile`/`Form()` parameters with 422 if this package is missing.

**BLOCKER-2 — et-xmlfile transitive dependency**
Resolution: After `pip install openpyxl==3.1.5`, run `pip show et-xmlfile` and pin the exact reported version. Add both lines to `requirements.txt` in alphabetical order before `fastapi`:
```
et-xmlfile==<version-from-pip-show>
openpyxl==3.1.5
python-multipart==0.0.29
```

**BLOCKER-3 — skipped row accounting formula**
Resolution: Two distinct branches must be implemented:
- Fully-empty row (all mapped fields None): increment skipped counter silently, do NOT append to errors
- Partial row with missing required field: append `CustomerCodeImportError`

Formula `skipped = total_rows - inserted - len(errors)` is correct only when applied AFTER both branches. The code structure must be explicit to avoid double-counting.

---

### Area 6 — Backend wiring (SPEC §3.1–3.4)

**openpyxl absent from requirements.txt**
Resolution: See Area 5 BLOCKER-1 and BLOCKER-2.

**et-xmlfile transitive dep**
Resolution: See Area 5 BLOCKER-2.

**Steps 3.5–3.8 out of scope for wiring agent**
Resolution: Audit taxonomy (AuditCategory Literal + events.py helper) must be completed by the audit-wiring agent BEFORE the router goes live. The customer_code route emits `"customer_codes"` audit events — the `AuditLog` model's Literal must include it before startup or Beanie will reject writes.

**GET /template and POST /import route ordering**
Resolution: Ordering is enforced inside `routes/customer_code.py` (the domain router), not by the aggregator in `routes/__init__.py`. The `__init__.py` `include_router` call is order-independent across domains.

---

### Area 7 — Frontend types + API (import.ts, template.ts, options.ts)

**BLOCKER — ApiError class import path**
Resolution: Import `ApiError` from `"@/api/client"` (it is a class defined there). Do NOT import from `"@/types/api/error"` — that file only exports interfaces (`NormalizedApiError`, `ApiErrorBody`), not the class.

**BLOCKER — BASE_URL not exported from client.ts**
Resolution: Duplicate the env-var logic at the top of both `import.ts` and `template.ts`:
```ts
const BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? "/api"
```

**BLOCKER — Curried options factory (no region analog)**
Resolution: `searchCustomerCodeFieldOptions(field)` returns `(q: string) => Promise<AsyncOption[]>`. This is a new pattern — there is no region analog. Freeze the outer call with `useMemo` or define per-field fetchers outside render to prevent referential churn that would re-trigger `useAsyncOptions` on every render.

**BLOCKER — Binary response guard in import.ts**
Resolution: `res.json()` may throw if the server returns a non-JSON binary body (e.g. 413 before reaching the JSON layer). Use `.catch(() => null)` then synthesize a fallback `ApiErrorBody`:
```ts
const json: unknown = await res.json().catch(() => null)
const envelope = json as Partial<ApiSuccess<CustomerCodeImportResult>> & { error?: ApiErrorBody }
if (!res.ok || envelope?.success !== true) {
  const body: ApiErrorBody = envelope?.error ?? { code: "UNKNOWN", message: res.statusText || "Import failed" }
  throw new ApiError(body, res.status)
}
```

**BLOCKER — GET /template URL**
Resolution: URL must be exactly `${BASE_URL}/admin/customer-codes/template` — no trailing slash, no query string.

---

### Area 8 — Frontend component contracts (§4.3)

**BLOCKER 1 — options.ts fetcher referential stability**
Resolution: In `CustomerCodeFilters.tsx`, freeze each field's fetcher outside render or via `useMemo`:
```ts
const FETCHERS = Object.fromEntries(
  FIELD_FILTERS.map(({ field }) => [field, searchCustomerCodeFieldOptions(field)])
) as Record<CustomerCodeField, (q: string) => Promise<AsyncOption[]>>
```

**BLOCKER 2 — AuditCategoryBadge CATEGORY_MAP is a closed `as const satisfies` object**
Resolution: Add `"customer_codes"` to both the TS union in `audit-log.ts` AND the runtime `CATEGORY_MAP` in `AuditCategoryBadge.tsx`. The union must be widened FIRST, then the badge entry added. Sky is already used by `system` — use `rose` for `customer_codes` instead.

**BLOCKER 3 — Region filter query key is "region" not "region_id"**
Resolution: The `AsyncCombobox` for region filter maps `value` → `query.region` (not `query.region_id`) and `onChange` calls `applyFilter({ region: value ?? undefined })`. The backend schema maps `filt["region_id"] = query.region` internally.

**BLOCKER 4 — Pagination prop names**
Resolution:
- `CustomerCodeTable` prop: `loading: boolean` (NOT `isLoading`)
- `CustomerCodeTablePagination` prop: `isLoading: boolean` (NOT `loading`)
These are the exact names used by `RegionTable` and `RegionTablePagination` respectively.

**BLOCKER 5 — SegmentBadge case-insensitive lookup**
Resolution: Always call `segment.trim().toLowerCase()` before the `SEGMENT_MAP` lookup. Stored values include `"oem"`, `"OEM"`, `"Retail"`, `"Stock transfer"` — mixed case is the norm, not an edge case.

---

### Area 9 — Frontend dialogs, hooks, page composition (§4.3–4.4)

**BLOCKER-1 — AdminPageHeader does not exist**
Resolution: Inline the page header pattern verbatim from `RegionManagementPage`:
```tsx
<div className="flex items-start gap-3">
  <span aria-hidden className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
    <Boxes className="size-4" />
  </span>
  <div>
    <h2 className="text-xl font-semibold tracking-tight text-foreground">Customer Code Management</h2>
    <p className="text-sm text-muted-foreground mt-0.5">Manage SAP customer codes, segments, and regional assignments.</p>
  </div>
</div>
<Separator />
```

**BLOCKER-2 — ConfirmActionDialog "delete" variant copies "Delete user"**
Resolution: Change `VARIANT_CONFIG.delete.title` to `"Delete"` and description to `Permanently delete "${label}"? This action cannot be undone.` — makes it domain-neutral. One-line change, no behavioral impact.

**BLOCKER-3 — import mutation not in useCustomerCodeMutations**
Resolution: Import mutation is NOT in `useCustomerCodeMutations`. `ImportCustomerCodesDialog` owns its own async state (upload progress, result summary). On success it calls `onImported()` which the page wires to `actions.refetch()`. Toast for import success is called inside the dialog itself.

**BLOCKER-4 — CustomerCodeQueryState filter setters**
Resolution: Use a single `setFilter(patch: Partial<...>)` setter (not 11 individual setters) that resets page to 1. This is the deliberate pattern for this domain given the field count.

**BLOCKER-5 — loading prop name**
Resolution: See Area 8 BLOCKER 4.

---

### Area 10 — Frontend wiring (SPEC §4.5)

**BLOCKER — AuditCategory sequencing**
Resolution: FE edits must happen in this order:
1. `audit-log.ts` — widen AuditCategory union (add `| "customer_codes"`)
2. `AuditCategoryBadge.tsx` — add CATEGORY_MAP entry (union widened first)
3. `nav-items.ts` — add nav entry (independent)
4. `App.tsx` — add route (only after `pages/admin/customer-codes/index.tsx` is built)

**BLOCKER — "customer_codes" key spelling in CATEGORY_MAP**
Resolution: Must be spelled with underscore and lowercase exactly: `"customer_codes"`. Any other casing or separator causes a TypeScript narrowing error.

**BLOCKER — sky color already taken by system**
Resolution: Use `rose` for `customer_codes` badge:
```ts
className: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-400"
```

**Icon choice — Building2 vs Boxes**
Resolution: Use `Building2` (unused anywhere in the codebase). `Boxes` is used in `home/index.tsx` stat card — reusing it in nav creates visual ambiguity. Both are valid per SPEC wording; `Building2` is the cleaner choice. Use `Building2` consistently across nav-items, page header icon chip, ViewSheet header, and `CustomerCodeTable` empty state.

---

## Builder Notes

### File: backend/app/models/customer_code.py

```python
"""CustomerCode document model (MongoDB collection ``customer_codes``, via Beanie)."""

from __future__ import annotations
from datetime import datetime, timezone
from typing import Annotated
from beanie import Document, Indexed
from pydantic import Field


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


class CustomerCode(Document):
    segment:          Annotated[str, Indexed()]
    code:             Annotated[str, Indexed()]
    customer:         Annotated[str, Indexed()]
    destination:      Annotated[str, Indexed()]
    cam:              str | None = None
    mob:              str | None = None
    head:             str | None = None
    route:            str | None = None
    ship_to:          str | None = None
    ship_to_customer: str | None = None
    region_id:        Annotated[str, Indexed()]
    created_at:       Annotated[datetime, Indexed()] = Field(default_factory=_now_utc)
    updated_at:       datetime = Field(default_factory=_now_utc)

    class Settings:
        name = "customer_codes"
```

---

### File: backend/app/schemas/customer_code.py

**Imports and AsyncOption alias:**
```python
from .admin_user import AsyncOption  # NOT from .audit_log
CustomerCodeOption = AsyncOption     # type alias, no new class
```

**CustomerCodeSortBy:**
```python
CustomerCodeSortBy = Literal["segment","code","customer","destination","cam","head","route","created_at","updated_at"]
```

**Combined strip validator (covers region_id):**
```python
@field_validator(
    "segment", "code", "customer", "destination", "region_id",
    "cam", "mob", "head", "route", "ship_to", "ship_to_customer",
    mode="before",
)
@classmethod
def strip_and_normalize(cls, v: object) -> object:
    if v is None:
        return None
    if not isinstance(v, str):
        v = str(v)
    stripped = v.strip()
    return stripped if stripped else None
```

For required fields: returning `None` causes `min_length=1` to fail with a clear error. For optional fields: returning `None` satisfies `str | None = None`.

**CustomerCodeCreate field definitions:**
```python
# Required
segment:     str = Field(min_length=1, max_length=200)
code:        str = Field(min_length=1, max_length=200)
customer:    str = Field(min_length=1, max_length=200)
destination: str = Field(min_length=1, max_length=200)
region_id:   str = Field(min_length=1)
# Optional
cam:              str | None = Field(default=None, max_length=200)
mob:              str | None = Field(default=None, max_length=200)
head:             str | None = Field(default=None, max_length=200)
route:            str | None = Field(default=None, max_length=200)
ship_to:          str | None = Field(default=None, max_length=200)
ship_to_customer: str | None = Field(default=None, max_length=200)
```

---

### File: backend/app/utils/customer_code/query.py

```python
"""Query helpers for the customer_code domain (filter + sort building).

Applies re.escape to all user-supplied strings before $regex (ReDoS guard, OWASP A05).
Free-text search (q) uses $or across all ten text fields.
Per-field filters are exact-match predicates.
"""

from __future__ import annotations
import re
from typing import Any
from ...schemas.customer_code import CustomerCodeListQuery

_TEXT_FIELDS = (
    "segment", "code", "customer", "destination",
    "cam", "mob", "head", "route", "ship_to", "ship_to_customer",
)

def escape_regex(s: str) -> str:
    return re.escape(s)

def build_customer_code_filter(query: CustomerCodeListQuery) -> dict[str, Any]:
    filt: dict[str, Any] = {}
    if query.q:
        rx = {"$regex": escape_regex(query.q), "$options": "i"}
        filt["$or"] = [{field: rx} for field in _TEXT_FIELDS]
    for field in _TEXT_FIELDS:
        value = getattr(query, field, None)
        if value is not None:
            filt[field] = value
    # Region FK filter — query key is "region", DB field is "region_id"
    if query.region is not None:
        filt["region_id"] = query.region
    return filt

def build_sort(sort_by: str, sort_order: str) -> str:
    prefix = "+" if sort_order == "asc" else "-"
    return f"{prefix}{sort_by}"
```

---

### File: backend/app/utils/customer_code/excel.py

**Header map (paste verbatim):**
```python
import re

def normalize_header(h: object) -> str:
    return re.sub(r"\s+", " ", str(h)).strip().lower()

HEADER_MAP: dict[str, str] = {
    "segment":          "segment",
    "code":             "code",
    "customer":         "customer",
    "destination":      "destination",
    "cam":              "cam",               # 'CAM ' trailing space stripped by normalize_header
    "mob no.":          "mob",               # 'MOB No.' → 'mob no.'
    "mob no":           "mob",               # alias: period dropped by some exports
    "mob":              "mob",               # bare alias
    "head":             "head",
    "route":            "route",
    "ship to":          "ship_to",
    "ship to customer": "ship_to_customer",
}

REQUIRED_FIELDS: tuple[str, ...] = ("segment", "code", "customer", "destination")
MAX_IMPORT_ROWS: int = 50_000
```

**cell_to_str (handles int, float, str, None — verified from real file):**
```python
def cell_to_str(v: object) -> str | None:
    if v is None:
        return None
    if isinstance(v, float):
        return str(int(v)) if v.is_integer() else str(v)
    s = str(v).strip()
    return s if s else None
```

**Known data quirks from real file:**
- `code` (col 2): int for 76/77 rows; str `'na'` for row 16 — `cell_to_str` handles correctly, `'na'` inserts as-is (no uniqueness constraint, no digit-only validation required)
- `MOB No.` (col 6): int for 63 rows; str `'*017142 (Hot line)'` for rows 66–71 — `mob` is free-text string, not digit-only
- `SHIP TO` (col 9): int on 2 rows (e.g. 40047421); str `'KAT039'` on row 16 — mixed types, handled correctly
- Cols 11 and 12 (`None` headers): col 12 has 3 stray int cells (rows 44–46) — the `None`-header guard in `parse_workbook` correctly skips these; do NOT remove the guard

**parse_workbook openpyxl pattern:**
```python
def parse_workbook(file_bytes: bytes) -> tuple[list[dict], list[CustomerCodeImportError]]:
    import io
    import openpyxl  # lazy import — app.main loads without openpyxl installed

    wb = openpyxl.load_workbook(io.BytesIO(file_bytes), read_only=True, data_only=True)
    ws = wb.active
    rows = list(ws.iter_rows(values_only=True))  # buffer ALL rows BEFORE wb.close()
    wb.close()  # REQUIRED: releases file handles in read_only mode

    if not rows:
        return [], []

    header_row = rows[0]
    col_field_map: dict[int, str] = {}
    for col_idx, h in enumerate(header_row):
        if h is None:
            continue
        norm = normalize_header(h)
        field = HEADER_MAP.get(norm)
        if field:
            col_field_map[col_idx] = field

    data_rows = rows[1:]
    if len(data_rows) > MAX_IMPORT_ROWS:
        return [], [CustomerCodeImportError(
            row=0,
            message=f"Sheet exceeds {MAX_IMPORT_ROWS} row limit ({len(data_rows)} rows found). Split the file.",
        )]

    valid_rows: list[dict] = []
    errors: list[CustomerCodeImportError] = []

    for row_idx, raw_row in enumerate(data_rows, start=2):
        parsed = {
            field: cell_to_str(raw_row[col_i] if col_i < len(raw_row) else None)
            for col_i, field in col_field_map.items()
        }
        # Branch A: fully-empty → skip silently (counted in skipped, not errors)
        if all(v is None for v in parsed.values()):
            continue
        # Branch B: missing required field → error row
        missing = [f for f in REQUIRED_FIELDS if not parsed.get(f)]
        if missing:
            errors.append(CustomerCodeImportError(
                row=row_idx,
                message=f"Missing required fields: {', '.join(missing)}",
            ))
            continue
        valid_rows.append(parsed)

    return valid_rows, errors
```

**Template canonical headers:**
```python
TEMPLATE_HEADERS = [
    "Segment", "code", "Customer", "Destination",
    "CAM", "MOB No.", "Head", "ROUTE", "SHIP TO", "SHIP TO CUSTOMER",
]
# Use "CAM" without trailing space — normalize_header collapses it on re-import
```

---

### File: backend/app/services/customer_code/region_link.py

```python
from beanie import PydanticObjectId
from ...core.errors import ValidationError
from ...models.region import Region

async def resolve_region_or_400(region_id: str) -> Region:
    try:
        oid = PydanticObjectId(region_id)
    except Exception:
        raise ValidationError("Invalid or unknown region.", details={"field": "region_id"})
    doc = await Region.get(oid)
    if doc is None:
        raise ValidationError("Invalid or unknown region.", details={"field": "region_id"})
    return doc
```

---

### File: backend/app/services/customer_code/update.py

```python
from __future__ import annotations
from beanie import PydanticObjectId
from ...core.errors import NotFoundError, ValidationError
from ...models.customer_code import CustomerCode, _now_utc
from ...schemas.customer_code import CustomerCodePublic, CustomerCodeUpdate
from ..audit.events import audit_customer_code_event
from .region_link import resolve_region_or_400, region_name_for
from .serialize import to_customer_code_public

async def update_customer_code(
    code_id: str, data: CustomerCodeUpdate, actor_email: str | None
) -> CustomerCodePublic:
    try:
        oid = PydanticObjectId(code_id)
    except Exception:
        raise NotFoundError("Customer code not found.")

    doc: CustomerCode | None = await CustomerCode.get(oid)
    if doc is None:
        raise NotFoundError("Customer code not found.")

    changed: list[str] = []
    update_data = data.model_dump(exclude_unset=True)

    # Enumerate each field explicitly — do NOT use a generic setattr loop
    if "segment" in update_data:
        doc.segment = update_data["segment"]; changed.append("segment")
    if "code" in update_data:
        doc.code = update_data["code"]; changed.append("code")
    if "customer" in update_data:
        doc.customer = update_data["customer"]; changed.append("customer")
    if "destination" in update_data:
        doc.destination = update_data["destination"]; changed.append("destination")
    if "cam" in update_data:
        doc.cam = update_data["cam"]; changed.append("cam")
    if "mob" in update_data:
        doc.mob = update_data["mob"]; changed.append("mob")
    if "head" in update_data:
        doc.head = update_data["head"]; changed.append("head")
    if "route" in update_data:
        doc.route = update_data["route"]; changed.append("route")
    if "ship_to" in update_data:
        doc.ship_to = update_data["ship_to"]; changed.append("ship_to")
    if "ship_to_customer" in update_data:
        doc.ship_to_customer = update_data["ship_to_customer"]; changed.append("ship_to_customer")
    if "region_id" in update_data:
        await resolve_region_or_400(update_data["region_id"])
        doc.region_id = update_data["region_id"]; changed.append("region_id")

    doc.updated_at = _now_utc()
    await doc.save()

    await audit_customer_code_event(
        "customer_code.updated",
        f"Updated customer code '{doc.code}' ({doc.customer})",
        actor_email=actor_email,
        extra={"code_id": str(doc.id), "changed": changed},
    )
    region_name = await region_name_for(doc.region_id)
    return to_customer_code_public(doc, region_name)
```

NOTE: No `ConflictError` check — CustomerCode has no uniqueness constraint (unlike Region).

---

### File: backend/app/services/customer_code/delete.py

```python
from __future__ import annotations
from beanie import PydanticObjectId
from ...core.errors import NotFoundError
from ...models.customer_code import CustomerCode
from ..audit.events import audit_customer_code_event

async def delete_customer_code(code_id: str, actor_email: str | None) -> None:
    try:
        oid = PydanticObjectId(code_id)
    except Exception:
        raise NotFoundError("Customer code not found.")

    doc: CustomerCode | None = await CustomerCode.get(oid)
    if doc is None:
        raise NotFoundError("Customer code not found.")

    code_val = doc.code
    customer = doc.customer
    await doc.delete()

    await audit_customer_code_event(
        "customer_code.deleted",
        f"Deleted customer code '{code_val}' ({customer})",
        actor_email=actor_email,
        extra={"code_id": code_id, "code": code_val, "customer": customer},
    )
```

---

### File: backend/app/services/customer_code/options.py

```python
filt: dict[str, Any] = {}
if query.q:
    filt[query.field] = {"$regex": escape_regex(query.q), "$options": "i"}

# Positional args — second arg is the filter dict (not a keyword)
values: list[Any] = await CustomerCode.distinct(query.field, filt)

results: list[CustomerCodeOption] = []
for v in values:
    if v is None:
        continue
    s = str(v).strip()
    if not s:
        continue
    results.append(CustomerCodeOption(value=s, label=s))

results.sort(key=lambda o: o.label.lower())
return results[: query.limit]
```

---

### File: backend/app/services/customer_code/import_rows.py

**insert_many call:**
```python
docs = [
    CustomerCode(
        segment=row["segment"], code=row["code"],
        customer=row["customer"], destination=row["destination"],
        cam=row.get("cam"), mob=row.get("mob"), head=row.get("head"),
        route=row.get("route"), ship_to=row.get("ship_to"),
        ship_to_customer=row.get("ship_to_customer"),
        region_id=region_id,
    )
    for row in valid_rows
]
if docs:
    await CustomerCode.insert_many(docs)
inserted = len(docs)  # NOT from insert_many return value (it's InsertManyResult)
```

**Skipped count formula** (after both branches complete):
```python
total_rows = len(data_rows)      # rows excluding header
# inserted = len(docs) from above
# skipped = fully-empty rows (silently skipped via `continue` in branch A)
skipped = total_rows - inserted - len(errors)
```

**Audit call for import:**
```python
await audit_customer_code_event(
    "customer_code.imported",
    f"Imported {inserted} rows into region '{region.name}'",
    actor_email=actor_email,
    extra={
        "region_id": region_id, "region_name": region.name,
        "total_rows": total_rows, "inserted": inserted,
        "skipped": skipped, "error_count": len(errors),
    },
)
```

---

### File: backend/app/services/audit/events.py — append after audit_region_event

```python
async def audit_customer_code_event(
    action: str,
    summary: str,
    outcome: str = "success",
    actor_email: str | None = None,
    extra: dict[str, Any] | None = None,
) -> None:
    """Record a customer-code management mutation event (created, updated, deleted, imported).

    Args:
        action:      Dot-namespaced identifier, e.g. ``"customer_code.created"``.
        summary:     Human-readable description.
        outcome:     ``"success"`` | ``"failure"`` | ``"error"``; defaults to ``"success"``.
        actor_email: Admin actor email threaded from ``admin.emailid``; ``None`` if unavailable.
        extra:       Arbitrary extra context (code_id, region_id, changed fields, row count).
    """
    await record_audit(
        category="customer_codes",  # NOT "regions", NOT "customer_code" singular
        action=action,
        summary=summary,
        outcome=outcome,
        source="service",
        actor_email=actor_email,
        extra=extra,
    )
```

---

### Files: backend/app/models/audit_log.py + backend/app/schemas/audit_log.py + backend/app/services/audit_log/options.py

Three surgical edits — all in a single commit:

**models/audit_log.py line 17:**
```python
AuditCategory = Literal["http","auth","admin","data","system","cron","security","regions","customer_codes"]
```

**schemas/audit_log.py line 22:**
```python
AuditCategory = Literal["http","auth","admin","data","system","cron","security","regions","customer_codes"]
```

**services/audit_log/options.py line 28:**
```python
_CATEGORIES: list[str] = ["http","auth","admin","data","system","cron","security","regions","customer_codes"]
```

---

### Files: backend/app/models/__init__.py + backend/app/core/database.py + backend/app/routes/__init__.py

**models/__init__.py:**
```python
from .audit_log import AuditLog
from .customer_code import CustomerCode
from .region import Region
from .user import User

__all__ = ["AuditLog", "CustomerCode", "Region", "User"]
```

**core/database.py:**
```python
# Change import line:
from ..models import AuditLog, CustomerCode, Region, User
# Change DOCUMENT_MODELS:
DOCUMENT_MODELS = [User, AuditLog, CustomerCode, Region]
```

**routes/__init__.py:**
```python
# Change import line:
from . import admin_user, audit_log, auth, customer_code, meta, region, user
# Add include_router (after region.router):
api_router.include_router(region.router)
api_router.include_router(customer_code.router)
```

---

### File: backend/requirements.txt

Insert before the `fastapi` line (alphabetical order):
```
et-xmlfile==<run pip show et-xmlfile after install to confirm>
openpyxl==3.1.5
python-multipart==0.0.29
```

After editing, run:
```bash
cd backend && .venv/bin/pip install -r requirements.txt
```

**Verification gate:**
```bash
cd backend
.venv/bin/python -c "import app.main; print('OK')"
.venv/bin/python -c "import openpyxl; print('openpyxl OK')"
.venv/bin/pip check
.venv/bin/python -c "
from app.utils.customer_code.excel import parse_workbook, build_template_workbook
rows, errs = parse_workbook(open('../macro_files/west  central customer codes.xlsx','rb').read())
assert len(rows) >= 1, 'no valid rows'
assert build_template_workbook()[:2] == b'PK', 'not valid xlsx'
print('excel utils OK:', len(rows), 'valid rows,', len(errs), 'errors')
"
```

---

### File: backend/app/controllers/customer_code.py

**Frozensets:**
```python
_ALLOWED_LIST_KEYS = frozenset({
    "page", "limit", "sortBy", "sortOrder", "q",
    "segment", "code", "customer", "destination",
    "cam", "mob", "head", "route", "ship_to", "ship_to_customer",
    "region",
})
_ALLOWED_OPTION_KEYS = frozenset({"field", "q", "limit"})
```

**Multipart import controller:**
```python
MAX_UPLOAD_BYTES = 10 * 1024 * 1024  # 10 MB

async def import_customer_codes_controller(
    file: UploadFile = File(...),
    region_id: str = Form(...),
    admin: AuthUser = Depends(get_current_admin),
) -> SuccessEnvelope[CustomerCodeImportResult]:
    if not file.filename or not file.filename.lower().endswith(".xlsx"):
        raise ValidationError("Only .xlsx files are accepted.", details={"field": "file"})
    raw = await file.read()
    if len(raw) > MAX_UPLOAD_BYTES:
        raise ValidationError(
            f"File exceeds 10 MB limit ({len(raw)} bytes).",
            details={"field": "file"},
        )
    result = await import_customer_codes(raw, region_id, actor_email=admin.emailid)
    return success(result, message="Import complete")
```

**StreamingResponse template controller:**
```python
async def download_template_controller(
    _admin: AuthUser = Depends(get_current_admin),
) -> StreamingResponse:
    """GET /admin/customer-codes/template — returns binary .xlsx, NOT a JSON envelope."""
    data = build_template_workbook()
    return StreamingResponse(
        BytesIO(data),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": 'attachment; filename="customer_codes_template.xlsx"'},
    )
```

---

### File: backend/app/routes/customer_code.py

**Route registration order (CRITICAL — literal segments before /{code_id}):**
```
1. GET  ""              → list_customer_codes_controller         (response_model=SuccessEnvelope[list[CustomerCodePublic]])
2. GET  /options        → field_options_controller               (response_model=SuccessEnvelope[list[CustomerCodeOption]])
3. GET  /template       → download_template_controller           (NO response_model — StreamingResponse)
4. POST /import         → import_customer_codes_controller       (response_model=SuccessEnvelope[CustomerCodeImportResult])
5. POST ""              → create_customer_code_controller        (response_model=SuccessEnvelope[CustomerCodePublic], status_code=201)
6. GET  /{code_id}      → get_customer_code_controller           (response_model=SuccessEnvelope[CustomerCodePublic])
7. PATCH /{code_id}     → update_customer_code_controller        (response_model=SuccessEnvelope[CustomerCodePublic])
8. DELETE /{code_id}    → delete_customer_code_controller        (response_model=SuccessEnvelope[None])
```

---

### File: frontend/src/api/admin/customer-codes/import.ts

```ts
import { ApiError } from "@/api/client"          // class — NOT from @/types/api/error
import type { ApiErrorBody } from "@/types/api/error"
import type { ApiSuccess } from "@/types/api/envelope"
import type { CustomerCodeImportResult } from "@/types/admin/customer-code"

// BASE_URL not exported from client.ts — must duplicate here
const BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? "/api"

export async function importCustomerCodes(
  file: File,
  regionId: string,
): Promise<CustomerCodeImportResult> {
  // Raw fetch — NOT apiClient. apiClient forces Content-Type: application/json
  // which breaks multipart/form-data. Browser sets Content-Type + boundary automatically.
  const form = new FormData()
  form.append("file", file)
  form.append("region_id", regionId)

  const res = await fetch(`${BASE_URL}/admin/customer-codes/import`, {
    method: "POST",
    credentials: "include",
    body: form,
  })

  // Guard: res.json() may throw if server returns non-JSON binary (e.g. 413)
  const json: unknown = await res.json().catch(() => null)
  const envelope = json as Partial<ApiSuccess<CustomerCodeImportResult>> & { error?: ApiErrorBody }

  if (!res.ok || envelope?.success !== true) {
    const body: ApiErrorBody = envelope?.error ?? {
      code: "UNKNOWN",
      message: res.statusText || "Import failed",
    }
    throw new ApiError(body, res.status)
  }

  return (envelope as ApiSuccess<CustomerCodeImportResult>).data
}
```

---

### File: frontend/src/api/admin/customer-codes/template.ts

```ts
import { ApiError } from "@/api/client"
import type { ApiErrorBody } from "@/types/api/error"

const BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? "/api"

export async function downloadCustomerCodesTemplate(): Promise<void> {
  const res = await fetch(`${BASE_URL}/admin/customer-codes/template`, {
    method: "GET",
    credentials: "include",
  })

  if (!res.ok) {
    const json: unknown = await res.json().catch(() => null)
    const envelope = json as { error?: ApiErrorBody } | null
    const body: ApiErrorBody = envelope?.error ?? {
      code: "UNKNOWN",
      message: res.statusText || "Template download failed",
    }
    throw new ApiError(body, res.status)
  }

  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = "customer_codes_template.xlsx"
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
```

---

### File: frontend/src/api/admin/customer-codes/options.ts

```ts
import { buildQuery, getData } from "@/api/client"
import type { AsyncOption } from "@/types/admin/options"
import type { CustomerCodeField } from "@/types/admin/customer-code"

// Curried factory — new pattern, no region analog. Freeze outer call to prevent
// referential churn that would re-trigger useAsyncOptions on every render.
export function searchCustomerCodeFieldOptions(
  field: CustomerCodeField,
): (q: string) => Promise<AsyncOption[]> {
  return (q: string) =>
    getData<AsyncOption[]>(
      `/admin/customer-codes/options${buildQuery({ field, q, limit: 20 })}`,
    )
}
```

**Usage in CustomerCodeFilters.tsx — define fetchers outside render:**
```ts
// At module level or once with useMemo([]) — never inline in JSX
const FETCHERS = Object.fromEntries(
  FIELD_FILTERS.map(({ field }) => [field, searchCustomerCodeFieldOptions(field)])
) as Record<CustomerCodeField, (q: string) => Promise<AsyncOption[]>>
```

---

### File: frontend/src/types/admin/customer-code.ts

```ts
import type { PageQuery } from "@/types/api/envelope"
import type { AsyncOption } from "@/types/admin/options"

export type CustomerCodeOption = AsyncOption  // alias, do NOT redefine the shape

export interface CustomerCodeImportError {
  row: number
  message: string
}

export interface CustomerCodeImportResult {
  total_rows: number
  inserted: number
  skipped: number
  region_id: string
  region_name: string | null
  errors: CustomerCodeImportError[]
}

export type CustomerCodeField =
  | "segment" | "code" | "customer" | "destination"
  | "cam" | "mob" | "head" | "route" | "ship_to" | "ship_to_customer"

export type CustomerCodeSortBy =
  | "segment" | "code" | "customer" | "destination"
  | "cam" | "head" | "route" | "created_at" | "updated_at"

export interface CustomerCodeListQuery extends PageQuery {
  sortBy?: CustomerCodeSortBy
  q?: string
  segment?: string
  code?: string
  customer?: string
  destination?: string
  cam?: string
  mob?: string
  head?: string
  route?: string
  ship_to?: string
  ship_to_customer?: string
  region?: string  // region_id exact match — query key is "region" (NOT "region_id")
}
```

---

### File: frontend/src/types/admin/customer-code-ui.ts

**Hook return contract:**
```ts
export type CustomerCodeQueryState = {
  page: number; limit: number
  sortBy: CustomerCodeSortBy; sortOrder: "asc" | "desc"
  q: string
  segment: string; code: string; customer: string; destination: string
  cam: string; mob: string; head: string; route: string
  ship_to: string; ship_to_customer: string
  region: string  // region_id exact match
}

export type CustomerCodeDialogState =
  | { type: "none" }
  | { type: "create" }
  | { type: "view";           customerCode: CustomerCode }
  | { type: "edit";           customerCode: CustomerCode }
  | { type: "confirm-delete"; customerCode: CustomerCode }
  | { type: "import" }

export interface UseCustomerCodeManagementResult {
  query: CustomerCodeQueryState
  setPage: (page: number) => void
  setLimit: (limit: number) => void
  setSort: (sortBy: CustomerCodeSortBy, sortOrder: "asc" | "desc") => void
  setSearch: (q: string) => void
  setFilter: (patch: Partial<Pick<CustomerCodeQueryState,
    "segment"|"code"|"customer"|"destination"|"cam"|"mob"|"head"|"route"|"ship_to"|"ship_to_customer"|"region"
  >>) => void  // single setter, resets page to 1
  clearFilters: () => void
  rows: CustomerCode[]
  meta: PaginationMeta | null
  loading: boolean  // NOT isLoading
  error: string | null
  dialog: CustomerCodeDialogState
  openDialog: (d: CustomerCodeDialogState) => void
  closeDialog: () => void
  actions: {
    refetch: () => void
    remove: (id: string) => Promise<void>
    // No toggleActive — customer codes have no active flag
  }
}
```

**DEFAULT_QUERY:**
```ts
const DEFAULT_QUERY: CustomerCodeQueryState = {
  page: 1, limit: 20,
  sortBy: "created_at", sortOrder: "desc",
  q: "",
  segment: "", code: "", customer: "", destination: "",
  cam: "", mob: "", head: "", route: "", ship_to: "", ship_to_customer: "",
  region: "",
}
```

**Strip empty strings before API call:**
```ts
const params: CustomerCodeListQuery = {
  page: q.page, limit: q.limit, sortBy: q.sortBy, sortOrder: q.sortOrder,
  ...(q.q ? { q: q.q } : {}),
  ...(q.segment ? { segment: q.segment } : {}),
  ...(q.code ? { code: q.code } : {}),
  ...(q.customer ? { customer: q.customer } : {}),
  ...(q.destination ? { destination: q.destination } : {}),
  ...(q.cam ? { cam: q.cam } : {}),
  ...(q.mob ? { mob: q.mob } : {}),
  ...(q.head ? { head: q.head } : {}),
  ...(q.route ? { route: q.route } : {}),
  ...(q.ship_to ? { ship_to: q.ship_to } : {}),
  ...(q.ship_to_customer ? { ship_to_customer: q.ship_to_customer } : {}),
  ...(q.region ? { region: q.region } : {}),
}
```

---

### File: frontend/src/types/admin/audit-log.ts

Add `| "customer_codes"` to AuditCategory union (do this FIRST, before editing AuditCategoryBadge.tsx):
```ts
export type AuditCategory =
  | "http" | "auth" | "admin" | "data" | "system"
  | "cron" | "security" | "regions"
  | "customer_codes"
```

---

### File: frontend/src/components/admin/audit-logs/AuditCategoryBadge.tsx

Add to CATEGORY_MAP (sky is taken by `system` — use `rose`):
```ts
customer_codes: {
  label: "Customer Codes",
  className:
    "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-400",
},
```

---

### File: frontend/src/components/layout/nav-items.ts

```ts
import { Building2, LayoutDashboard, MapPin, ScrollText, UsersRound } from "lucide-react"

export const ADMIN_NAV_ITEMS: NavItem[] = [
  { label: "User Management", to: "/admin/users", icon: UsersRound },
  { label: "Audit Logs", to: "/admin/audit-logs", icon: ScrollText },
  { label: "Region Management", to: "/admin/regions", icon: MapPin },
  { label: "Customer Codes", to: "/admin/customer-codes", icon: Building2 },
]
```

`titleForPath()` requires no change — startsWith match resolves `"/admin/customer-codes"` to `"Customer Codes"` automatically.

---

### File: frontend/src/App.tsx

Add after existing region route (only after `pages/admin/customer-codes/index.tsx` is built):
```tsx
import { CustomerCodeManagementPage } from "@/pages/admin/customer-codes"

// Inside <AdminRoute>:
<Route path="/admin/customer-codes" element={<CustomerCodeManagementPage />} />
```

---

### Frontend component do/dont summary

**CustomerCodeTable:**
- Prop: `loading: boolean` (NOT `isLoading`)
- Columns (max 8): Segment (SegmentBadge) | Code (font-mono text-xs) | Customer (truncate+tooltip) | Destination | Region | CAM | ROUTE | Actions
- Do NOT show `ship_to`, `ship_to_customer`, `mob`, `head`, or timestamps — ViewSheet only
- `aria-sort` on all sortable headers; copy `SortableHead` from RegionTable verbatim

**CustomerCodeTablePagination:**
- Prop: `isLoading: boolean` (NOT `loading`)
- Pagination label: `{total === 1 ? "customer code" : "customer codes"}`

**SegmentBadge:**
```tsx
const key = segment.trim().toLowerCase()
const cfg = SEGMENT_MAP[key] ?? defaultSlate
// Lowercase normalization is REQUIRED — stored values include "oem", "OEM", "Retail"
```

**ImportCustomerCodesDialog:**
- Do NOT use `apiClient` — use raw `fetch` with `FormData`
- Do NOT close the dialog immediately on success — show result summary first (row errors)
- `aria-live="polite"` on result summary wrapper
- Toast for import is called inside the dialog (unique — shows row-level result)

**ConfirmActionDialog:**
- Change `VARIANT_CONFIG.delete.title` from `"Delete user"` to `"Delete"` (domain-neutral)
- Change description to: `Permanently delete "${label}"? This action cannot be undone.`

**Icon:** Use `Building2` throughout (nav-items, page header chip, ViewSheet header, table empty state). Do NOT mix with `Boxes`.

---

## Go/No-Go

GO — all blockers have concrete resolutions; no hard blocker remains unresolved. Phase-2 builders may proceed with the above ADDENDUM as the authoritative correction layer over SPEC.md.

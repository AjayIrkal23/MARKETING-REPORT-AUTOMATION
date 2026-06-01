# BE implementation note: list / options / serialize / query

**Area:** `app/services/jsw_stock/{list,options,serialize}.py` +
`app/utils/jsw_stock/query.py` + `app/schemas/jsw_stock.py` (list+options slice)

**Validation status:** SPEC contract verified against live reference implementations
(customer_code domain) and Beanie 2.1.0 venv introspection. Two corrections
documented below.

---

## Corrections / clarifications

### 1. dateFrom / dateTo — use `datetime | None` in schema, NOT `str | None`

SPEC §2 says `dateFrom: str|None`, `dateTo: str|None` and "parsed via
`datetime.fromisoformat`, tolerant of trailing Z" inside `query.py`.

**This is wrong** — use the same pattern as the audit_log domain instead:

- Declare `dateFrom: datetime | None = None` and `dateTo: datetime | None = None`
  directly in `JswStockListQuery`.
- Pydantic v2 parses ISO-8601 strings (including trailing `Z`) into `datetime`
  objects automatically at validation time. Verified: `'2025-01-15T00:00:00Z'`
  → `datetime(2025, 1, 15, 0, 0, tzinfo=UTC)` with no extra code.
- `query.py` then receives ready-made `datetime | None` objects — no manual
  `fromisoformat` call needed. The `$gte/$lte` predicates use them directly,
  identical to `utils/audit_log/query.py`.

This simplifies `query.py` and eliminates an error-prone manual parse step.

### 2. Beanie `distinct` — 2nd positional arg confirmed

`JswStock.distinct(query.field, filt)` is correct.

Verified against Beanie 2.1.0 installed in `.venv`:

```
distinct sig: (key: str, filter: Mapping[str, Any] | None = None,
               session: AsyncClientSession | None = None, **kwargs) -> list
```

Filter is the **second positional argument**, not a keyword argument. Do NOT
write `JswStock.distinct(query.field, filter=filt)` — that will raise
`TypeError: distinct() got an unexpected keyword argument 'filter'`.

### 3. AsyncOption import source

`AsyncOption` is defined in `app/schemas/admin_user` (line 128).
`app/schemas/customer_code` imports it from there: `from .admin_user import AsyncOption`.
The jsw_stock options service must do the same:

```python
from ...schemas.admin_user import AsyncOption
```

Do NOT redefine `AsyncOption` in `schemas/jsw_stock.py`. Do NOT import from
`schemas/audit_log` (that module defines its own local copy that happens to
have the same shape — `admin_user` is the canonical source).

### 4. q-fields count discrepancy — SPEC says "10 q-fields" but lists 10 correctly

SPEC §2 prose says "q `$or` over the 10 q-fields". The §1 table marks 10 fields
with `q`: `sold_to_party`, `ship_to_party`, `customer`, `party_code`,
`customer_name`, `material`, `jsw_grade`, `batch`, `sales_order_no`,
`sales_office`. Count is correct — 10. Note `customer_name` is a **derived
meta field** (not an Excel column), meaning `$regex` must run against the
`customer_name` field stored on the document. This is intentional and correct.

---

## File skeletons

### `app/schemas/jsw_stock.py` (list + options slice only)

```python
# app/schemas/jsw_stock.py
"""JSW Stock request/response DTOs — list, options, and sort/filter literals.

Mirrors schemas/customer_code.py pattern.
AsyncOption imported exclusively from .admin_user (same rule as customer_code).
dateFrom/dateTo are datetime | None — Pydantic v2 parses ISO-8601+Z natively.
"""
from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

from .admin_user import AsyncOption  # canonical source — do NOT redefine
from .common import PageQuery

# ---------------------------------------------------------------------------
# Literals
# ---------------------------------------------------------------------------

JswStockSortBy = Literal[
    "created_at", "report_date", "customer", "customer_name",
    "party_code", "sold_to_party", "ship_to_party", "material",
    "jsw_grade", "sales_office", "so_sales_org", "sales_order_type",
    "distr_chnl", "so_product_form", "nco_declared", "batch",
    "unrestr_qty", "stock_quantity", "aging",
]

JswStockField = Literal[
    "so_sales_org", "sales_order_type", "distr_chnl", "sold_to_party",
    "party_code", "ship_to_party", "customer", "material",
    "sales_office", "so_product_form", "jsw_grade", "nco_declared",
]

# ---------------------------------------------------------------------------
# Query DTOs
# ---------------------------------------------------------------------------

class JswStockListQuery(PageQuery):
    """Query params for GET /jsw-stock."""

    sortBy: JswStockSortBy = "created_at"
    q: str | None = Field(default=None, max_length=200)
    # 12 per-field exact-match filters (one per JswStockField)
    so_sales_org: str | None = Field(default=None, max_length=200)
    sales_order_type: str | None = Field(default=None, max_length=200)
    distr_chnl: str | None = Field(default=None, max_length=200)
    sold_to_party: str | None = Field(default=None, max_length=200)
    party_code: str | None = Field(default=None, max_length=200)
    ship_to_party: str | None = Field(default=None, max_length=200)
    customer: str | None = Field(default=None, max_length=200)
    material: str | None = Field(default=None, max_length=200)
    sales_office: str | None = Field(default=None, max_length=200)
    so_product_form: str | None = Field(default=None, max_length=200)
    jsw_grade: str | None = Field(default=None, max_length=200)
    nco_declared: str | None = Field(default=None, max_length=200)
    # Date-range filter on created_at — Pydantic v2 parses ISO-8601+Z natively
    dateFrom: datetime | None = None
    dateTo: datetime | None = None


class JswStockOptionsQuery(BaseModel):
    """Query params for GET /jsw-stock/options."""

    field: JswStockField
    q: str | None = Field(default=None, max_length=200)
    limit: int = Field(default=20, ge=1, le=50)
```

---

### `app/utils/jsw_stock/query.py`

```python
# app/utils/jsw_stock/query.py
"""Query helpers for the jsw_stock domain (filter + sort building).

Mirrors utils/customer_code/query.py.
re.escape applied to all $regex inputs (ReDoS guard, OWASP A05).
dateFrom/dateTo arrive as datetime | None from Pydantic — no fromisoformat needed.
"""
from __future__ import annotations

import re
from typing import Any

from ...schemas.jsw_stock import JswStockListQuery

# 10 fields eligible for $or free-text search (q param) — SPEC §1 q-column
_Q_FIELDS = (
    "sold_to_party",
    "ship_to_party",
    "customer",
    "party_code",
    "customer_name",   # derived meta field stored on document
    "material",
    "jsw_grade",
    "batch",
    "sales_order_no",
    "sales_office",
)

# 12 fields exposed as per-field exact-match filter params — SPEC §1 filter-column
_FILTER_FIELDS = (
    "so_sales_org",
    "sales_order_type",
    "distr_chnl",
    "sold_to_party",
    "party_code",
    "ship_to_party",
    "customer",
    "material",
    "sales_office",
    "so_product_form",
    "jsw_grade",
    "nco_declared",
)


def escape_regex(s: str) -> str:
    """Escape s for safe use inside a MongoDB $regex value (ReDoS guard)."""
    return re.escape(s)


def build_jsw_stock_filter(query: JswStockListQuery) -> dict[str, Any]:
    """Translate validated query params into a MongoDB filter document.

    - q: case-insensitive $regex $or across the 10 q-fields; re.escape applied.
    - 12 per-field filters: exact string match when non-None.
    - dateFrom / dateTo: $gte / $lte on created_at (datetime objects from Pydantic).
    """
    filt: dict[str, Any] = {}

    # -- free-text $or search --------------------------------------------------
    if query.q:
        rx = {"$regex": escape_regex(query.q), "$options": "i"}
        filt["$or"] = [{field: rx} for field in _Q_FIELDS]

    # -- per-field exact-match filters -----------------------------------------
    for field in _FILTER_FIELDS:
        value = getattr(query, field, None)
        if value is not None:
            filt[field] = value

    # -- date-range on created_at ----------------------------------------------
    ts: dict[str, Any] = {}
    if query.dateFrom is not None:
        ts["$gte"] = query.dateFrom
    if query.dateTo is not None:
        ts["$lte"] = query.dateTo
    if ts:
        filt["created_at"] = ts

    return filt


def build_sort(sort_by: str, sort_order: str) -> str:
    """Build a Beanie sort token (+field / -field) from whitelisted input."""
    prefix = "+" if sort_order == "asc" else "-"
    return f"{prefix}{sort_by}"
```

---

### `app/services/jsw_stock/serialize.py`

```python
# app/services/jsw_stock/serialize.py
"""JswStock document -> public DTO serialisation. No I/O, no side-effects."""
from __future__ import annotations

from typing import TYPE_CHECKING

from ...schemas.jsw_stock_record import JswStockPublic

if TYPE_CHECKING:
    from ...models.jsw_stock import JswStock


def to_jsw_stock_public(doc: "JswStock") -> JswStockPublic:
    """Map a JswStock document to JswStockPublic.

    id = str(doc.id) — ObjectId never leaks to callers.
    All 72 domain fields + 7 meta fields mapped directly.
    No region lookup needed (customer_name / customer_code_id already stored).
    """
    return JswStockPublic(
        id=str(doc.id),
        # --- Excel columns 1-72 (pass through directly; types guaranteed by model) ---
        so_sales_org=doc.so_sales_org,
        sales_order_type=doc.sales_order_type,
        distr_chnl=doc.distr_chnl,
        sold_to_party=doc.sold_to_party,
        party_code=doc.party_code,
        ship_to_party=doc.ship_to_party,
        customer=doc.customer,
        material=doc.material,
        sales_office=doc.sales_office,
        so_product_form=doc.so_product_form,
        jsw_grade=doc.jsw_grade,
        act_thickness_mm=doc.act_thickness_mm,
        width_mm=doc.width_mm,
        batch=doc.batch,
        unrestr_qty=doc.unrestr_qty,
        in_quality_insp=doc.in_quality_insp,
        blocked=doc.blocked,
        stock_quantity=doc.stock_quantity,
        usage_decision=doc.usage_decision,
        nco_declared=doc.nco_declared,
        next_workcenter=doc.next_workcenter,
        length_mm=doc.length_mm,
        nco_reason=doc.nco_reason,
        ud_remarks=doc.ud_remarks,
        aging=doc.aging,
        production_date=doc.production_date,
        shift=doc.shift,
        sales_order_no=doc.sales_order_no,
        so_item_num=doc.so_item_num,
        order_status=doc.order_status,
        location=doc.location,
        str_no=doc.str_no,
        sto_no=doc.sto_no,
        do_no=doc.do_no,
        shipment=doc.shipment,
        storage_location=doc.storage_location,
        port_name=doc.port_name,
        unloading_point=doc.unloading_point,
        recieving_point=doc.recieving_point,
        purchase_order_number=doc.purchase_order_number,
        scheduled_status=doc.scheduled_status,
        eq_specification=doc.eq_specification,
        eq_sub_grade=doc.eq_sub_grade,
        so_end_application=doc.so_end_application,
        production_workcenter=doc.production_workcenter,
        ys_in_mpa=doc.ys_in_mpa,
        elongation=doc.elongation,
        elongation_mic=doc.elongation_mic,
        hardness=doc.hardness,
        s_aluminium_pct=doc.s_aluminium_pct,
        s_boron_pct=doc.s_boron_pct,
        s_carbon_pct=doc.s_carbon_pct,
        s_chromium_pct=doc.s_chromium_pct,
        s_copper_pct=doc.s_copper_pct,
        s_manganese_pct=doc.s_manganese_pct,
        s_molybdenum_pct=doc.s_molybdenum_pct,
        s_nickel_pct=doc.s_nickel_pct,
        s_niobium_pct=doc.s_niobium_pct,
        s_phosphorus_pct=doc.s_phosphorus_pct,
        s_silicon_pct=doc.s_silicon_pct,
        s_sulphur_pct=doc.s_sulphur_pct,
        s_titanium_pct=doc.s_titanium_pct,
        s_vanadium_pct=doc.s_vanadium_pct,
        tensile_strength_mpa_b=doc.tensile_strength_mpa_b,
        yield_strength=doc.yield_strength,
        uts=doc.uts,
        special_stock=doc.special_stock,
        cp_number=doc.cp_number,
        cp_end_date=doc.cp_end_date,
        lc_exp_date=doc.lc_exp_date,
        route=doc.route,
        route_desc=doc.route_desc,
        # --- mapping + meta ---
        party_code_normalized=doc.party_code_normalized,
        customer_name=doc.customer_name,
        customer_code_id=doc.customer_code_id,
        report_date=doc.report_date,
        source_file=doc.source_file,
        created_at=doc.created_at,
        updated_at=doc.updated_at,
    )
```

**Line count:** This file will be ~90 lines — well under 250.

---

### `app/services/jsw_stock/list.py`

```python
# app/services/jsw_stock/list.py
"""JswStock domain: backend-driven paginated listing.

Mirrors services/customer_code/list.py exactly.
No region lookup needed — customer_name is stored on the document.
"""
from __future__ import annotations

from math import ceil

from ...core.responses import PaginationMeta
from ...models.jsw_stock import JswStock
from ...schemas.jsw_stock import JswStockListQuery
from ...schemas.jsw_stock_record import JswStockPublic
from ...utils.jsw_stock.query import build_jsw_stock_filter, build_sort
from .serialize import to_jsw_stock_public


async def list_jsw_stock(
    query: JswStockListQuery,
) -> tuple[list[JswStockPublic], PaginationMeta]:
    """Return a page of JswStock rows plus stable pagination metadata.

    filter → count → sort/skip/limit → serialize → meta.
    All filtering and sorting run in DB layer (no client-side filtering).
    """
    filt = build_jsw_stock_filter(query)

    total = await JswStock.find(filt).count()

    docs = (
        await JswStock.find(filt)
        .sort(build_sort(query.sortBy, query.sortOrder))
        .skip(query.skip)
        .limit(query.limit)
        .to_list()
    )

    items = [to_jsw_stock_public(doc) for doc in docs]

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

**Line count:** ~55 lines.

---

### `app/services/jsw_stock/options.py`

```python
# app/services/jsw_stock/options.py
"""JswStock domain: async combobox field-options search.

Mirrors services/customer_code/options.py.
Beanie 2.x: filter is the 2nd POSITIONAL arg to distinct() — not keyword.
AsyncOption imported from schemas.admin_user (canonical source).
"""
from __future__ import annotations

import re
from typing import Any

from ...models.jsw_stock import JswStock
from ...schemas.admin_user import AsyncOption
from ...schemas.jsw_stock import JswStockOptionsQuery


def _escape_regex(s: str) -> str:
    """Escape s for safe MongoDB $regex use (ReDoS guard)."""
    return re.escape(s)


async def search_field_options(
    query: JswStockOptionsQuery,
) -> list[AsyncOption]:
    """Return up to query.limit distinct field values as combobox options.

    Uses JswStock.distinct(field, filter) — Beanie 2.x filter is 2nd positional
    arg. None / blank values are dropped. Results sorted case-insensitively,
    capped to limit.
    """
    filt: dict[str, Any] = {}
    if query.q:
        filt[query.field] = {
            "$regex": _escape_regex(query.q),
            "$options": "i",
        }

    # CRITICAL: filter is positional arg #2, not keyword.
    # JswStock.distinct(query.field, filter=filt) -> TypeError
    # JswStock.distinct(query.field, filt)        -> correct
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

**Line count:** ~55 lines.

---

## Import chain diagram

```
schemas/jsw_stock.py
  └─ from .admin_user import AsyncOption   (canonical)
  └─ from .common import PageQuery

utils/jsw_stock/query.py
  └─ from ...schemas.jsw_stock import JswStockListQuery

services/jsw_stock/serialize.py
  └─ from ...schemas.jsw_stock_record import JswStockPublic
  └─ TYPE_CHECKING: from ...models.jsw_stock import JswStock

services/jsw_stock/list.py
  └─ from ...models.jsw_stock import JswStock
  └─ from ...schemas.jsw_stock import JswStockListQuery
  └─ from ...schemas.jsw_stock_record import JswStockPublic
  └─ from ...utils.jsw_stock.query import build_jsw_stock_filter, build_sort
  └─ from .serialize import to_jsw_stock_public
  └─ from ...core.responses import PaginationMeta

services/jsw_stock/options.py
  └─ from ...models.jsw_stock import JswStock
  └─ from ...schemas.admin_user import AsyncOption
  └─ from ...schemas.jsw_stock import JswStockOptionsQuery
```

---

## Key invariants to maintain

| Rule | Detail |
|------|--------|
| No client-side filtering | `list_jsw_stock` only issues `find(filt).sort().skip().limit()` — never filters Python list |
| `distinct` positional arg | `JswStock.distinct(field, filt)` not `distinct(field, filter=filt)` |
| `AsyncOption` source | Always `from ...schemas.admin_user import AsyncOption` — never re-declared |
| `dateFrom`/`dateTo` type | `datetime \| None` in schema; raw datetime passed to MongoDB — no string parsing in query.py |
| `re.escape` on all `$regex` | Applied in both `build_jsw_stock_filter` (q) and `search_field_options` (q) |
| `created_at` date range key | The `$gte/$lte` block keys to `"created_at"` (not `"report_date"` or `"timestamp"`) |
| 10 q-fields include `customer_name` | `customer_name` is stored as a denormalized field on every document — `$regex` against it is valid |

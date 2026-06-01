# be-services-core — Builder-Ready Notes
## JVML Stock: query.py / list.py / options.py / serialize.py

> Author: Backend list/options/serialize/query area architect
> Date: 2026-05-31
> SPEC ref: `.planning/jvml-stock/SPEC.md` §1, §2

---

## 1. Files the builder will create

```
backend/app/utils/jvml_stock/query.py
backend/app/services/jvml_stock/list.py
backend/app/services/jvml_stock/options.py
backend/app/services/jvml_stock/serialize.py
```

---

## 2. Confirmed patterns from reference code

### 2.1 PaginationMeta construction (confirmed from `core/responses.py`)

```python
from math import ceil
from ...core.responses import PaginationMeta

meta = PaginationMeta(
    page=query.page,
    limit=query.limit,
    total=total,
    totalPages=ceil(total / query.limit) if query.limit else 0,
    sortBy=query.sortBy,
    sortOrder=query.sortOrder,
)
```

`PaginationMeta` fields: `page: int`, `limit: int`, `total: int`, `totalPages: int`,
`sortBy: str`, `sortOrder: str`. All are required at construction — no defaults.

### 2.2 sort string format (confirmed from `utils/customer_code/query.py`)

```python
def build_sort(sort_by: str, sort_order: str) -> str:
    prefix = "+" if sort_order == "asc" else "-"
    return f"{prefix}{sort_by}"
```

Beanie 2.x `.sort()` accepts a `+field` / `-field` prefixed string. This is the
exact pattern to mirror.

### 2.3 Beanie 2.x `.distinct()` call signature (confirmed from both options files)

```python
# CORRECT — filter is 2nd positional arg, NOT a keyword arg
values: list[Any] = await JvmlStock.distinct(query.field, filt)

# WRONG — do not do this
values = await JvmlStock.distinct(query.field, filter=filt)  # BROKEN in Beanie 2.x
```

### 2.4 AsyncOption import path (confirmed from `schemas/admin_user.py`)

```python
from ...schemas.admin_user import AsyncOption
```

`AsyncOption` fields: `value: str`, `label: str`, `sublabel: str | None = None`.
The options service does NOT set `sublabel` (leave as None, matching customer_code pattern).

### 2.5 PageQuery import + `.skip` property (confirmed from `schemas/common.py`)

```python
from ...schemas.common import PageQuery, PaginationMeta  # PageQuery for extension
```

`PageQuery.skip` is a `@property` = `(self.page - 1) * self.limit`. Use `query.skip`
directly in `.skip()` — do not recompute.

`PageQuery` defaults: `page=1`, `limit=20 (ge=1,le=100)`, `sortOrder="desc"`.
`JvmlStockListQuery(PageQuery)` adds `sortBy: JvmlStockSortBy = "created_at"`.

---

## 3. Ready-to-paste: `app/utils/jvml_stock/query.py`

```python
"""Query helpers for the jvml_stock domain (filter + sort building).

``build_jvml_stock_filter`` applies ``re.escape`` to all user-supplied string
inputs before any ``$regex`` construction (ReDoS guard, OWASP A05).
Free-text search (``q``) uses ``$or`` across the 10 q-fields defined in SPEC §1.
Per-field exact-match filters apply to the 10 ``JvmlStockField`` Literal fields.
Date-range filter uses ``created_at`` with ``$gte``/``$lte``; ISO strings with
optional trailing ``Z`` are parsed tolerantly via ``datetime.fromisoformat``.
"""

from __future__ import annotations

import re
from datetime import datetime
from typing import Any, TYPE_CHECKING

if TYPE_CHECKING:
    from ...schemas.jvml_stock import JvmlStockListQuery

# 10 fields included in free-text $or search (SPEC §1, q column).
_Q_FIELDS = (
    "sold_to_party",
    "ship_to_party",
    "customer",
    "party_code",
    "customer_name",
    "material",
    "jsw_grade",
    "batch",
    "sales_order_no",
    "sales_office",
)

# 10 fields exposed as per-field exact-match filter params (SPEC §1, filter column).
_FILTER_FIELDS = (
    "so_sales_org",
    "sales_order_type",
    "distr_chnl",
    "sold_to_party",
    "customer",
    "material",
    "sales_office",
    "so_product_form",
    "jsw_grade",
    "nco_declared",
)


def escape_regex(s: str) -> str:
    """Escape ``s`` for safe use inside a MongoDB ``$regex`` value (ReDoS guard)."""
    return re.escape(s)


def _parse_iso_tolerant(s: str) -> datetime:
    """Parse an ISO-8601 datetime string, tolerating a trailing ``Z``."""
    # Python < 3.11 fromisoformat does not handle trailing Z.
    return datetime.fromisoformat(s.rstrip("Z"))


def build_jvml_stock_filter(query: "JvmlStockListQuery") -> dict[str, Any]:
    """Translate validated query params into a MongoDB filter document.

    Free-text search (``q``) runs a case-insensitive ``$regex`` across the 10
    q-fields using ``$or``.  Per-field exact-match filters are applied when
    non-``None``.  Date-range is matched against ``created_at``.
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

    # -- created_at date-range filter ------------------------------------------
    date_clause: dict[str, datetime] = {}
    if query.dateFrom:
        date_clause["$gte"] = _parse_iso_tolerant(query.dateFrom)
    if query.dateTo:
        date_clause["$lte"] = _parse_iso_tolerant(query.dateTo)
    if date_clause:
        filt["created_at"] = date_clause

    return filt


def build_sort(sort_by: str, sort_order: str) -> str:
    """Build a Beanie sort token (``+field`` / ``-field``) from whitelisted input.

    ``sort_by`` is constrained to ``JvmlStockSortBy`` at the schema layer.
    """
    prefix = "+" if sort_order == "asc" else "-"
    return f"{prefix}{sort_by}"
```

---

## 4. Ready-to-paste: `app/services/jvml_stock/list.py`

```python
"""JVML Stock domain business logic: backend-driven paginated listing.

Mirrors ``services/customer_code/list.py`` exactly — same pagination pattern,
same return-signature shape ``tuple[list[DTO], PaginationMeta]``.
All filtering and sorting run in the DB layer; no Python-side post-filtering
(``backend-api-standards``, no client-side filtering).

No region/FK lookup needed — all denormalised fields (customer_name,
customer_code_id) are already stored on each document.
"""

from __future__ import annotations

from math import ceil

from ...core.responses import PaginationMeta
from ...models.jvml_stock import JvmlStock
from ...schemas.jvml_stock import JvmlStockListQuery
from ...schemas.jvml_stock_record import JvmlStockPublic
from ...utils.jvml_stock.query import build_jvml_stock_filter, build_sort
from .serialize import to_jvml_stock_public


async def list_jvml_stock(
    query: JvmlStockListQuery,
) -> tuple[list[JvmlStockPublic], PaginationMeta]:
    """Return a page of JVML stock rows plus stable pagination metadata.

    Filtering, sorting, and pagination all run in the DB layer.

    Args:
        query: Validated list-query DTO carrying page, limit, sortBy,
               sortOrder, free-text ``q``, the 10 per-field filters, and
               optional ``dateFrom``/``dateTo`` ISO strings.

    Returns:
        A 2-tuple of ``(items, meta)`` where ``items`` is the serialised
        page and ``meta`` carries pagination bookkeeping for the frontend.
    """
    filt = build_jvml_stock_filter(query)

    total = await JvmlStock.find(filt).count()

    docs = (
        await JvmlStock.find(filt)
        .sort(build_sort(query.sortBy, query.sortOrder))
        .skip(query.skip)
        .limit(query.limit)
        .to_list()
    )

    items = [to_jvml_stock_public(doc) for doc in docs]

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

**Key difference vs customer_code/list.py:** No `region_name_map` batch lookup.
`to_jvml_stock_public(doc)` takes only the document (no second arg).

---

## 5. Ready-to-paste: `app/services/jvml_stock/options.py`

```python
"""JVML Stock service: async combobox field-options search.

Returns up to ``query.limit`` (1–50) ``AsyncOption`` entries whose
``query.field`` value matches the escaped free-text ``q`` (case-insensitive
regex).  Results are de-duplicated via ``distinct``, stripped of empty/None
values, sorted case-insensitively ascending, and capped to ``limit``.

All user input passed to ``$regex`` is escaped with ``re.escape``
(``owasp-security``, ReDoS guard, OWASP A05:2021).

Beanie 2.x API note: ``JvmlStock.distinct(field, filter_dict)`` accepts the
filter as the **second positional argument** — do not pass as a keyword arg.
"""

from __future__ import annotations

import re
from typing import Any

from ...models.jvml_stock import JvmlStock
from ...schemas.admin_user import AsyncOption
from ...schemas.jvml_stock import JvmlStockOptionsQuery


def _escape_regex(s: str) -> str:
    """Escape *s* for safe use in a MongoDB ``$regex`` value (ReDoS guard)."""
    return re.escape(s)


async def search_field_options(
    query: JvmlStockOptionsQuery,
) -> list[AsyncOption]:
    """Return up to ``query.limit`` distinct field values as combobox options.

    Args:
        query: ``JvmlStockOptionsQuery`` containing:
               - ``field``: one of the 10 ``JvmlStockField`` literals.
               - ``q``: optional free-text matched against ``field`` via
                 a case-insensitive escaped regex; absent → no filter.
               - ``limit``: maximum results to return (1–50, default 20).

    Returns:
        List of ``AsyncOption`` instances sorted ascending (case-insensitive)
        and capped to ``query.limit``.
    """
    filt: dict[str, Any] = {}
    if query.q:
        filt[query.field] = {
            "$regex": _escape_regex(query.q),
            "$options": "i",
        }

    # Beanie 2.x: filter is the second positional arg (NOT keyword).
    values: list[Any] = await JvmlStock.distinct(query.field, filt)

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

**Note:** `AsyncOption` is imported from `...schemas.admin_user`, NOT from any
jvml_stock schema. `sublabel` is left as `None` (default) — consistent with
customer_code options pattern.

---

## 6. Ready-to-paste: `app/services/jvml_stock/serialize.py`

This file maps all 79 stored fields (72 data + 7 meta) to `JvmlStockPublic`.

```python
"""JvmlStock serialisation helpers: document → public DTO.

``id`` is always ``str(doc.id)`` — the MongoDB ObjectId is never exposed
to callers (``api-contract-standards``, ``owasp-security``).
This function performs no I/O and has no side-effects.
"""

from __future__ import annotations

from typing import TYPE_CHECKING

from ...schemas.jvml_stock_record import JvmlStockPublic

if TYPE_CHECKING:
    from ...models.jvml_stock import JvmlStock


def to_jvml_stock_public(doc: "JvmlStock") -> JvmlStockPublic:
    """Map a ``JvmlStock`` document to the list/detail DTO ``JvmlStockPublic``.

    All 72 data fields + 7 meta fields are included.
    ``id`` is serialised via ``str(doc.id)`` — ObjectId never leaks to callers.
    """
    return JvmlStockPublic(
        id=str(doc.id),
        # --- §1 data fields (72) ---
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
        # --- §1 meta fields (7) ---
        party_code_normalized=doc.party_code_normalized,
        customer_name=doc.customer_name,
        customer_code_id=doc.customer_code_id,
        report_date=doc.report_date,
        source_file=doc.source_file,
        created_at=doc.created_at,
        updated_at=doc.updated_at,
    )
```

---

## 7. Import paths confirmed

| Symbol | Canonical import path |
|---|---|
| `AsyncOption` | `app.schemas.admin_user` |
| `PageQuery` | `app.schemas.common` |
| `PaginationMeta` | `app.core.responses` |
| `success()` | `app.core.responses` |
| `SuccessEnvelope` | `app.core.responses` |
| `JvmlStock` (model) | `app.models.jvml_stock` |
| `JvmlStockPublic` (DTO) | `app.schemas.jvml_stock_record` |
| `JvmlStockListQuery` | `app.schemas.jvml_stock` |
| `JvmlStockOptionsQuery` | `app.schemas.jvml_stock` |
| `build_jvml_stock_filter` | `app.utils.jvml_stock.query` |
| `build_sort` | `app.utils.jvml_stock.query` |
| `to_jvml_stock_public` | `app.services.jvml_stock.serialize` |

---

## 8. SPEC mismatches / warnings

**NONE found** — no disagreement between SPEC §1/§2 and the real reference code.
All patterns (PaginationMeta constructor args, sort prefix, Beanie `.distinct()`
positional filter, `re.escape` on `$regex`, `query.skip` from `PageQuery.skip`
property) are exactly as SPEC §2 describes.

### Implementation notes for the builder (not mismatches, just precision points)

1. **`_parse_iso_tolerant`**: Python 3.11+ `datetime.fromisoformat` accepts `Z`
   natively, but the codebase targets Python 3.13 so `s.rstrip("Z")` is still
   harmless and keeps the helper explicit. The `s.rstrip("Z")` approach is correct
   for both 3.11+ and edge cases like `"2026-01-01T00:00:00.000Z"`.

2. **`list.py` has no second arg to `to_jvml_stock_public`**: unlike
   `customer_code/list.py` which passes `region_name` as a second arg,
   `jvml_stock` stores `customer_name` / `customer_code_id` directly on the doc
   so the serializer is unary. Do not copy the `region_name_map` batch call.

3. **`options.py` uses `AsyncOption` from `schemas.admin_user`**: the `CustomerCode`
   domain defines its own `CustomerCodeOption` type alias, but the SPEC for
   jvml_stock explicitly says `AsyncOption from ...schemas.admin_user`. Use the
   shared type, not a domain-local alias.

4. **Sort default**: `JvmlStockListQuery.sortBy` default is `"created_at"` (SPEC §2).
   `JvmlStockSortBy` Literal has 19 members (see SPEC §1) — the schema layer
   enforces the whitelist so `build_sort` can trust its input.

5. **Per-field filter fields** (10): `so_sales_org`, `sales_order_type`, `distr_chnl`,
   `sold_to_party`, `customer`, `material`, `sales_office`, `so_product_form`,
   `jsw_grade`, `nco_declared`. These are the `JvmlStockField` Literal members.
   `build_jvml_stock_filter` iterates over this tuple via `getattr(query, field, None)`.

6. **q `$or` fields** (10): `sold_to_party`, `ship_to_party`, `customer`,
   `party_code`, `customer_name`, `material`, `jsw_grade`, `batch`,
   `sales_order_no`, `sales_office`. Note `customer_name` (a mapped meta field)
   IS included in `$or` — it must be indexed on the model for query efficiency.

7. **`__init__.py`**: both `app/utils/jvml_stock/__init__.py` and
   `app/services/jvml_stock/__init__.py` must be created as empty package markers.

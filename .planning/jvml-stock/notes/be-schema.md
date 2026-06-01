# JVML Stock — Backend Schema Builder Notes

**Area:** `backend/app/schemas/` (three new files)
**Reference implementations:** `schemas/customer_code.py`, `schemas/region.py`, `schemas/common.py`
**SPEC authority:** `.planning/jvml-stock/SPEC.md` §1 + §2

---

## 1. Files to create

| File | Primary exports |
|---|---|
| `backend/app/schemas/jvml_stock.py` | `JvmlStockSortBy`, `JvmlStockField`, `JvmlStockListQuery`, `JvmlStockOptionsQuery` |
| `backend/app/schemas/jvml_stock_record.py` | `JvmlStockPublic` |
| `backend/app/schemas/jvml_stock_config.py` | `JvmlStockConfigPublic`, `JvmlStockConfigUpdate`, `JvmlStockStatusPublic`, `JvmlStockIngestionRow` |

All three files stay **under 250 lines** each (straightforward given the field list split).

---

## 2. Confirmed import paths and signatures from reference code

### `AsyncOption` — CRITICAL import rule
Mirror `customer_code.py` lines 23–27: import from `.admin_user` ONLY.
```python
from .admin_user import AsyncOption
```
Do NOT redefine or import from anywhere else.

### `PageQuery` — base for `JvmlStockListQuery`
```python
from .common import PageQuery
# PageQuery fields: page: int = 1, limit: int = 20 (ge=1, le=100), sortOrder: Literal["asc","desc"] = "desc"
# property: skip -> int = (page-1)*limit
```

### `EmailStr` — for `JvmlStockConfigUpdate`
```python
from pydantic import BaseModel, EmailStr, Field, field_validator
```
`EmailStr` requires the `email-validator` package — already in `requirements.txt` (confirmed `email-validator==2.3.0`).

### `field_validator` mode pattern (from `region.py`)
```python
@field_validator("field_name", mode="before")
@classmethod
def validator_name(cls, v: ...) -> ...:
    ...
```
The `mode="before"` ensures raw input is normalized before Pydantic's own type checks run.
Multi-field validator uses `@field_validator(*_STRIP_FIELDS, mode="before")` (from `customer_code.py`).

---

## 3. Literal whitelists — exact per SPEC §1

### `JvmlStockField` (10 values, exact order from SPEC)
```python
JvmlStockField = Literal[
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
]
```

### `JvmlStockSortBy` (19 values, exact order from SPEC)
```python
JvmlStockSortBy = Literal[
    "created_at",
    "report_date",
    "customer",
    "customer_name",
    "party_code",
    "sold_to_party",
    "ship_to_party",
    "material",
    "jsw_grade",
    "sales_office",
    "so_sales_org",
    "sales_order_type",
    "distr_chnl",
    "so_product_form",
    "nco_declared",
    "batch",
    "unrestr_qty",
    "stock_quantity",
    "aging",
]
```
Default in query: `"created_at"`.

---

## 4. `jvml_stock.py` — ready-to-paste body

```python
"""JVML Stock list/query/options DTOs.

Contract source: .planning/jvml-stock/SPEC.md §1 + §2.
All list/sort/filter field names must stay in sync with
``utils/jvml_stock/query.py`` and the ``JvmlStock`` model.
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

from .admin_user import AsyncOption  # noqa: F401 — re-export for controller layer
from .common import PageQuery

# ---------------------------------------------------------------------------
# Sort key whitelist
# ---------------------------------------------------------------------------

JvmlStockSortBy = Literal[
    "created_at", "report_date", "customer", "customer_name",
    "party_code", "sold_to_party", "ship_to_party", "material",
    "jsw_grade", "sales_office", "so_sales_org", "sales_order_type",
    "distr_chnl", "so_product_form", "nco_declared", "batch",
    "unrestr_qty", "stock_quantity", "aging",
]

# Per-field filter whitelist (drives JvmlStockOptionsQuery + async-select)
JvmlStockField = Literal[
    "so_sales_org", "sales_order_type", "distr_chnl", "sold_to_party",
    "customer", "material", "sales_office", "so_product_form",
    "jsw_grade", "nco_declared",
]

# ---------------------------------------------------------------------------
# Query DTOs
# ---------------------------------------------------------------------------


class JvmlStockListQuery(PageQuery):
    """Query params for ``GET /jvml-stock``.

    Extends PageQuery (page, limit, sortOrder).  sortBy is a Literal whitelist
    so unknown values are rejected at parse time (backend-api-standards).
    The 10 per-field filters map to JvmlStockField values exactly.
    dateFrom / dateTo are ISO-8601 strings matched against created_at.
    """

    sortBy: JvmlStockSortBy = "created_at"
    # Free-text search across the 10 q-fields; length-capped for regex safety.
    q: str | None = Field(default=None, max_length=200)
    # Per-field exact-match filters (None = no filter applied).
    so_sales_org: str | None = Field(default=None, max_length=200)
    sales_order_type: str | None = Field(default=None, max_length=200)
    distr_chnl: str | None = Field(default=None, max_length=200)
    sold_to_party: str | None = Field(default=None, max_length=200)
    customer: str | None = Field(default=None, max_length=200)
    material: str | None = Field(default=None, max_length=200)
    sales_office: str | None = Field(default=None, max_length=200)
    so_product_form: str | None = Field(default=None, max_length=200)
    jsw_grade: str | None = Field(default=None, max_length=200)
    nco_declared: str | None = Field(default=None, max_length=200)
    # Date-range filter on created_at (ISO-8601 strings, e.g. "2024-01-15")
    dateFrom: str | None = None
    dateTo: str | None = None


class JvmlStockOptionsQuery(BaseModel):
    """Query params for ``GET /jvml-stock/options``.

    Returns distinct values for a single JvmlStockField, optionally filtered
    by search string q.  Hard-capped at 50.
    """

    field: JvmlStockField
    q: str | None = Field(default=None, max_length=200)
    limit: int = Field(default=20, ge=1, le=50)
```

**Note on allowed-keys frozenset in the controller** (not schema work, but related):
```python
_LIST_ALLOWED = frozenset({
    "page", "limit", "sortBy", "sortOrder", "q", "dateFrom", "dateTo",
    "so_sales_org", "sales_order_type", "distr_chnl", "sold_to_party",
    "customer", "material", "sales_office", "so_product_form",
    "jsw_grade", "nco_declared",
})
_OPTIONS_ALLOWED = frozenset({"field", "q", "limit"})
```

---

## 5. `jvml_stock_record.py` — ready-to-paste body

72 fields split into groups for readability. Text → `str | None`, number → `float | None`, date → `datetime | None`.

```python
"""JVML Stock record response DTO.

Contract source: .planning/jvml-stock/SPEC.md §1 (72 column map + meta fields).
Used for both list rows and the detail view sheet.
"""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel


class JvmlStockPublic(BaseModel):
    """Client-safe projection of a JvmlStock document.

    id is MongoDB ObjectId as plain str. All 72 source columns (text/number/date
    per SPEC §1) + 7 mapping/meta fields. Nullability mirrors the model —
    every field can be None except id, report_date, created_at, updated_at.
    """

    id: str

    # --- Group 1: Sales / Order identification (cols 1–11) ---
    so_sales_org: str | None
    sales_order_type: str | None
    distr_chnl: str | None
    sold_to_party: str | None
    party_code: str | None
    ship_to_party: str | None
    customer: str | None
    material: str | None
    sales_office: str | None
    so_product_form: str | None
    jsw_grade: str | None

    # --- Group 2: Dimensions (cols 12–14) ---
    act_thickness_mm: str | None
    width_mm: str | None
    batch: str | None

    # --- Group 3: Quantities (cols 15–18) ---
    unrestr_qty: float | None
    in_quality_insp: float | None
    blocked: float | None
    stock_quantity: float | None

    # --- Group 4: Quality / NCO (cols 19–24) ---
    usage_decision: str | None
    nco_declared: str | None
    next_workcenter: str | None
    length_mm: str | None
    nco_reason: str | None
    ud_remarks: str | None

    # --- Group 5: Aging / Production (cols 25–27) ---
    aging: float | None
    production_date: datetime | None
    shift: str | None

    # --- Group 6: Sales order details (cols 28–35) ---
    sales_order_no: str | None
    so_item_num: str | None
    order_status: str | None
    location: str | None
    str_no: str | None
    sto_no: str | None
    do_no: str | None
    shipment: str | None

    # --- Group 7: Logistics (cols 36–45) ---
    storage_location: str | None
    port_name: str | None
    unloading_point: str | None
    recieving_point: str | None   # SPEC spelling: recieving (not receiving)
    purchase_order_number: str | None
    scheduled_status: str | None
    eq_specification: str | None
    eq_sub_grade: str | None
    so_end_application: str | None
    production_workcenter: str | None

    # --- Group 8: Mechanical / Yield (cols 46–49) ---
    ys_in_mpa: float | None
    elongation: str | None
    elongation_mic: float | None
    hardness: str | None

    # --- Group 9: Chemistry % (cols 50–63) ---
    s_aluminium_pct: float | None
    s_boron_pct: float | None
    s_carbon_pct: float | None
    s_chromium_pct: float | None
    s_copper_pct: float | None
    s_manganese_pct: float | None
    s_molybdenum_pct: float | None
    s_nickel_pct: float | None
    s_niobium_pct: float | None
    s_phosphorus_pct: float | None
    s_silicon_pct: float | None
    s_sulphur_pct: float | None
    s_titanium_pct: float | None
    s_vanadium_pct: float | None

    # --- Group 10: Strength / Export (cols 64–72) ---
    tensile_strength_mpa_b: float | None
    yield_strength: str | None
    uts: str | None
    special_stock: str | None
    cp_number: str | None
    cp_end_date: datetime | None
    lc_exp_date: str | None       # text field per SPEC (dd.mm.yyyy stored as-is)
    route: str | None
    route_desc: str | None

    # --- Mapping meta (7 fields appended by ingestion) ---
    party_code_normalized: str | None
    customer_name: str | None
    customer_code_id: str | None
    report_date: str                   # dd-mm-yyyy, always set
    source_file: str | None
    created_at: datetime
    updated_at: datetime
```

**Line count check:** approximately 100 lines — well under 250.

---

## 6. `jvml_stock_config.py` — ready-to-paste body

```python
"""JVML Stock config + status DTOs.

Contract source: .planning/jvml-stock/SPEC.md §2 (schemas section).
Validators mirror schemas/region.py (normalize_emails) and add
path-traversal guard on file_name + HH:MM regex on start/end time.
"""

from __future__ import annotations

import re
from datetime import datetime

from pydantic import BaseModel, EmailStr, Field, field_validator

# ---------------------------------------------------------------------------
# Config public response
# ---------------------------------------------------------------------------


class JvmlStockConfigPublic(BaseModel):
    """Read-only projection of the JvmlStockConfig singleton.

    updated_at is None when the config has never been saved (defaults only).
    notify_emails is list[str] — output DTO, no re-validation.
    """

    enabled: bool
    base_path: str
    file_name: str
    start_time: str
    end_time: str
    interval_hours: int
    notify_emails: list[str]        # NOT list[EmailStr] — output DTO
    updated_at: datetime | None


# ---------------------------------------------------------------------------
# Config update body (PUT /admin/jvml-stock/config)
# ---------------------------------------------------------------------------

_TIME_RE = re.compile(r"^([01]\d|2[0-3]):[0-5]\d$")


class JvmlStockConfigUpdate(BaseModel):
    """PUT body for updating the JVML Stock config singleton.

    All fields required on PUT (full replacement semantics for a singleton
    config — no partial patch needed).  Validators apply security + format
    guards before Pydantic type checks.
    """

    enabled: bool
    base_path: str = Field(max_length=500)
    file_name: str = Field(max_length=200)
    start_time: str
    end_time: str
    interval_hours: int = Field(ge=1, le=24)
    notify_emails: list[EmailStr] = Field(default_factory=list, max_length=100)

    @field_validator("base_path", mode="before")
    @classmethod
    def strip_base_path(cls, v: object) -> object:
        """Strip leading/trailing whitespace from base_path."""
        if isinstance(v, str):
            return v.strip()
        return v

    @field_validator("file_name", mode="before")
    @classmethod
    def validate_file_name(cls, v: object) -> object:
        """Strip whitespace; reject path-traversal characters (/ \\ ..).

        Prevents directory traversal in the file lookup:
          <base_path>/<dd-mm-yyyy>/<file_name>.xlsx
        """
        if not isinstance(v, str):
            raise ValueError("file_name must be a string")
        v = v.strip()
        if not v:
            raise ValueError("file_name must not be empty")
        if "/" in v or "\\" in v or ".." in v:
            raise ValueError("file_name must not contain / \\ or ..")
        return v

    @field_validator("start_time", "end_time", mode="before")
    @classmethod
    def validate_time_format(cls, v: object) -> object:
        """Validate HH:MM format matching ^([01]\\d|2[0-3]):[0-5]\\d$."""
        if not isinstance(v, str):
            raise ValueError("time must be a string in HH:MM format")
        if not _TIME_RE.match(v):
            raise ValueError("time must be in HH:MM format (00:00–23:59)")
        return v

    @field_validator("notify_emails", mode="before")
    @classmethod
    def normalize_emails(cls, v: list | None) -> list:
        """Lowercase, strip, deduplicate (preserving order), cap at 100.

        Mirrors region.py RegionCreate.normalize_emails exactly.
        Runs mode='before' so normalized strings feed EmailStr validation.
        """
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
            raise ValueError("notify_emails list exceeds maximum of 100 recipients")
        return seen


# ---------------------------------------------------------------------------
# Status + ingestion history DTOs
# ---------------------------------------------------------------------------


class JvmlStockIngestionRow(BaseModel):
    """Single row in the recent ingestion history list.

    Used inside JvmlStockStatusPublic.recent (last N=14 runs).
    """

    report_date: str
    status: str
    row_count: int
    found_at: datetime | None
    created_at: datetime


class JvmlStockStatusPublic(BaseModel):
    """Read-only status snapshot returned by GET /admin/jvml-stock/status
    and POST /admin/jvml-stock/run-now.

    last_* fields come from the most recent JvmlStockIngestion doc (None
    if no ingestion record exists yet).  recent is capped at N=14 rows.
    """

    enabled: bool
    last_report_date: str | None
    last_status: str | None
    last_row_count: int | None
    last_found_at: datetime | None
    last_alerted_at: datetime | None
    last_error: str | None
    recent: list[JvmlStockIngestionRow]
```

**Line count check:** approximately 130 lines — well under 250.

---

## 7. Pattern reference: `field_validator` multi-field (mode="before")

Direct copy pattern from `customer_code.py` for stripping multiple fields at once:

```python
_STRIP_FIELDS = ("base_path",)  # expand as needed

@field_validator(*_STRIP_FIELDS, mode="before")
@classmethod
def strip_and_normalize(cls, v: object) -> object:
    if v is None:
        return None
    if not isinstance(v, str):
        v = str(v)
    stripped = v.strip()
    return stripped if stripped else None
```

For `JvmlStockConfigUpdate`, the config schema uses individual named validators (strip_base_path, validate_file_name, validate_time_format, normalize_emails) rather than a multi-field tuple — this is cleaner given each field has a distinct rule.

---

## 8. `notify_emails` — `list[EmailStr]` on input, `list[str]` on output

- `JvmlStockConfigUpdate.notify_emails: list[EmailStr]` — Pydantic validates email format AFTER the `normalize_emails` mode="before" validator runs.
- `JvmlStockConfigPublic.notify_emails: list[str]` — output DTO, no re-validation needed. This is the exact pattern from `region.py` (`RegionPublic.emails: list[str]`).

---

## 9. SPEC mismatches and ambiguities found

### MISMATCH 1 — `notify_emails` field constraint (`max_length` on `list` vs `max_length` on each `str`)
**SPEC says:** `notify_emails: list[EmailStr] (max_length=100)`
**What `max_length=100` means on a `list` field in Pydantic v2:** it constrains the LIST LENGTH to ≤100 items, NOT individual email string length.
**Real reference code (`region.py`):** enforces the 100-item cap inside the `normalize_emails` mode="before" validator with `raise ValueError("emails list exceeds maximum of 100 recipients")` — Pydantic's `list` field does not have a `max_length` kwarg in Field for Pydantic v2 without `Annotated`.
**Resolution:** Use `Field(default_factory=list)` WITHOUT `max_length=100` on the field; enforce the 100-item cap inside `normalize_emails` validator (exactly as `region.py` does). The ready-to-paste code above already implements this correctly.

### MISMATCH 2 — `JvmlStockConfigUpdate.file_name` empty rejection
**SPEC says:** strip + reject `/ \ ..`.
**Clarification:** an empty or whitespace-only `file_name` should also be rejected (it would produce a broken path `<base_path>/<date>/.xlsx`). The validator above adds this guard with `if not v: raise ValueError(...)` after stripping. This is a safe extension of the SPEC intent, not a deviation.

### MISMATCH 3 — `JvmlStockIngestionRow` fields vs `JvmlStockIngestion` model
**SPEC §2 (schemas section):** `JvmlStockIngestionRow` = `report_date, status, row_count, found_at, created_at`.
**SPEC §2 (models section):** `JvmlStockIngestion` has `alerted_at`, `error`, `file_path` etc.
**Resolution:** `JvmlStockIngestionRow` is a **summary** DTO for the status panel — it deliberately omits `alerted_at`, `file_path`, `error`. This is consistent with the SPEC. No mismatch, just a narrow projection.

### NOTE — `recieving_point` spelling
**SPEC column 39:** `RECIEVING POINT` → `recieving_point`. This IS a typo in the source Excel header (correct English would be "receiving"). The SPEC documents the actual Excel header verbatim. The field name in `JvmlStockPublic` and the model MUST match this spelling exactly (`recieving_point`), or the `HEADER_TO_FIELD` mapping in `columns.py` will fail to resolve column 39.

---

## 10. Controller frozenset pattern (from `customer_code.py` — repeat here for completeness)

```python
# In controllers/jvml_stock.py — unknown query key guard
_LIST_ALLOWED = frozenset({
    "page", "limit", "sortBy", "sortOrder", "q", "dateFrom", "dateTo",
    "so_sales_org", "sales_order_type", "distr_chnl", "sold_to_party",
    "customer", "material", "sales_office", "so_product_form",
    "jsw_grade", "nco_declared",
})

unknown = set(request.query_params.keys()) - _LIST_ALLOWED
if unknown:
    raise ValidationError(f"Unknown query parameters: {sorted(unknown)}")
```

---

## 11. Quick verification for the builder

After writing the three schema files, run:
```bash
cd /DATA/CODE_FILES/MARKETING\ REPORT\ AUTOMATION/backend
./.venv/bin/python -c "
from app.schemas.jvml_stock import JvmlStockSortBy, JvmlStockField, JvmlStockListQuery, JvmlStockOptionsQuery
from app.schemas.jvml_stock_record import JvmlStockPublic
from app.schemas.jvml_stock_config import JvmlStockConfigPublic, JvmlStockConfigUpdate, JvmlStockStatusPublic, JvmlStockIngestionRow
print('schemas OK')
"
```
Also confirm field count:
```bash
./.venv/bin/python -c "
from app.schemas.jvml_stock_record import JvmlStockPublic
fields = list(JvmlStockPublic.model_fields.keys())
# expect: id + 72 source + 7 meta = 80 total
print(len(fields), fields[:5], '...', fields[-5:])
"
```
Expected: 80 fields (`id` + 72 col fields + `party_code_normalized`, `customer_name`, `customer_code_id`, `report_date`, `source_file`, `created_at`, `updated_at`).

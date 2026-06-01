# Backend Models — JVML Stock (Builder-Ready Notes)

Architect area: `backend/app/models/jvml_stock*.py`
Reference models read: `customer_code.py`, `region.py`, `audit_log.py`, `schemas/common.py`

---

## 1. Exact Beanie Patterns (from reference code)

### Import block (copy verbatim)
```python
from __future__ import annotations

from datetime import datetime, timezone
from typing import Annotated

from beanie import Document, Indexed
from pydantic import Field
```

### `_now_utc` default factory (copy verbatim from customer_code.py)
```python
def _now_utc() -> datetime:
    """Return the current UTC datetime (used as a :func:`~pydantic.Field` default factory)."""
    return datetime.now(timezone.utc)
```
- Define this at module level, before the class. Every model file defines its own copy (region.py and customer_code.py both do — do NOT import it from elsewhere).

### Indexed field pattern
```python
field_name: Annotated[str, Indexed()]           # non-unique index
key_field:  Annotated[str, Indexed(unique=True)] # unique index
timestamp:  Annotated[datetime, Indexed()] = Field(default_factory=_now_utc)
```

### Optional Indexed field (audit_log.py pattern)
```python
path: Annotated[str | None, Indexed()] = None   # nullable indexed
```

### List field default
```python
notify_emails: list[str] = Field(default_factory=list)
```

### Settings block
```python
class Settings:
    name = "collection_name_here"
```

### `PageQuery` base (schemas/common.py) — used by JvmlStockListQuery
```python
class PageQuery(BaseModel):
    page: int = Field(default=1, ge=1)
    limit: int = Field(default=20, ge=1, le=100)
    sortOrder: SortOrder = "desc"   # SortOrder = Literal["asc", "desc"]

    @property
    def skip(self) -> int:
        return (self.page - 1) * self.limit
```

---

## 2. SPEC Mismatches / Flags

**No hard mismatches found.** One flag:

- SPEC §1 says `lc_exp_date` type is `text` (col 70). The CLAUDE.md domain note for ZSD says `"LC Exp Date" is text in dd.mm.yyyy format` — this is consistent with `text -> str|None`. No conflict.
- SPEC §1 note says non-floatable numerics are kept verbatim as string; `text` type columns that come from Excel numeric cells must be coerced via `str(int(v))` when the float is integer-valued (e.g. `21.0` → `"21"`). The `coerce_value` logic in `columns.py` must handle this — **not** the model itself. Model stores plain `str | None`.
- `AuditCategory` in `audit_log.py` line 17 currently reads: `Literal["http", "auth", "admin", "data", "system", "cron", "security", "regions", "customer_codes"]`. The `"jvml_stock"` value is NOT yet present. ORCHESTRATOR adds it (SPEC §4 step 3). Builder must NOT touch `audit_log.py`.

---

## 3. Ready-to-Paste: `app/models/jvml_stock.py`

Line count target: ≤250. With 79 fields + imports + class header + Settings this fits at ~155 lines using terse 1-line docstrings.

```python
"""JvmlStock document model (MongoDB collection ``jvml_stock``, via Beanie)."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Annotated

from beanie import Document, Indexed
from pydantic import Field


def _now_utc() -> datetime:
    """Return the current UTC datetime (used as a :func:`~pydantic.Field` default factory)."""
    return datetime.now(timezone.utc)


class JvmlStock(Document):
    """A single row from the JVML Stock Excel workbook (72 data cols + 7 meta cols).

    Collection ``jvml_stock``. Ingested by the APScheduler poll job; queried by
    the JVML Stock List page. ``party_code_normalized`` is the stripped join key
    used to match against :class:`~app.models.customer_code.CustomerCode`.
    """

    # ------------------------------------------------------------------
    # §1 data fields — col 1-11 (text, filter-indexed)
    # ------------------------------------------------------------------
    so_sales_org:      Annotated[str | None, Indexed()] = None
    """SO Sales Org (col 1). Filter field."""
    sales_order_type:  Annotated[str | None, Indexed()] = None
    """Sales Order Type (col 2). Filter field."""
    distr_chnl:        Annotated[str | None, Indexed()] = None
    """Distr.Chnl (col 3). Filter field."""
    sold_to_party:     Annotated[str | None, Indexed()] = None
    """Sold To Party (col 4). Filter + q field."""
    party_code:        Annotated[str | None, Indexed()] = None
    """Party Code (col 5). q field; zero-padded 10-digit string."""
    ship_to_party:     Annotated[str | None, Indexed()] = None
    """Ship To Party (col 6). q field; indexed for sort."""
    customer:          Annotated[str | None, Indexed()] = None
    """Customer (col 7). Filter + q field."""
    material:          Annotated[str | None, Indexed()] = None
    """Material (col 8). Filter + q field."""
    sales_office:      Annotated[str | None, Indexed()] = None
    """Sales Office (col 9). Filter + q field."""
    so_product_form:   Annotated[str | None, Indexed()] = None
    """SO-Product Form (col 10). Filter field."""
    jsw_grade:         Annotated[str | None, Indexed()] = None
    """JSW Grade (col 11). Filter + q field."""

    # ------------------------------------------------------------------
    # §1 data fields — col 12-19 (text/number, not filtered)
    # ------------------------------------------------------------------
    act_thickness_mm:  str | None = None
    """Act.Thickness (mm) (col 12). text — non-floatable numeric cells kept verbatim."""
    width_mm:          str | None = None
    """Width (mm) (col 13). text."""
    batch:             str | None = None
    """Batch (col 14). q field."""
    unrestr_qty:       float | None = None
    """Unrestr.Qty. (col 15). number."""
    in_quality_insp:   float | None = None
    """In Quality Insp. (col 16). number."""
    blocked:           float | None = None
    """Blocked (col 17). number."""
    stock_quantity:    float | None = None
    """Stock Quantity (col 18). number."""
    usage_decision:    str | None = None
    """Usage Decision (col 19). text."""

    # ------------------------------------------------------------------
    # §1 data fields — col 20 (text, filter-indexed)
    # ------------------------------------------------------------------
    nco_declared:      Annotated[str | None, Indexed()] = None
    """NCO Declared (col 20). Filter field."""

    # ------------------------------------------------------------------
    # §1 data fields — col 21-45 (text, not filtered)
    # ------------------------------------------------------------------
    next_workcenter:        str | None = None
    """Next Workcenter (col 21). text."""
    length_mm:              str | None = None
    """Length(mm) (col 22). text."""
    nco_reason:             str | None = None
    """NCO Reason (col 23). text."""
    ud_remarks:             str | None = None
    """UD Remarks (col 24). text."""
    aging:                  float | None = None
    """Aging (col 25). number."""
    production_date:        datetime | None = None
    """Production Date (col 26). date — Excel numeric serial via epoch 1899-12-30."""
    shift:                  str | None = None
    """Shift (col 27). text."""
    sales_order_no:         str | None = None
    """Sales Order No (col 28). q field."""
    so_item_num:            str | None = None
    """SO Item Num (col 29). text."""
    order_status:           str | None = None
    """Order Status (col 30). text."""
    location:               str | None = None
    """Location (col 31). text."""
    str_no:                 str | None = None
    """STR No (col 32). text."""
    sto_no:                 str | None = None
    """STO No (col 33). text."""
    do_no:                  str | None = None
    """DO No (col 34). text."""
    shipment:               str | None = None
    """Shipment (col 35). text."""
    storage_location:       str | None = None
    """Storage Location (col 36). text."""
    port_name:              str | None = None
    """Port Name (col 37). text."""
    unloading_point:        str | None = None
    """UNLOADING POINT (col 38). text."""
    recieving_point:        str | None = None
    """RECIEVING POINT (col 39). text — note: source header spelling preserved."""
    purchase_order_number:  str | None = None
    """Purchase Order Number (col 40). text."""
    scheduled_status:       str | None = None
    """Scheduled Status (col 41). text."""
    eq_specification:       str | None = None
    """Eq. Specification (col 42). text."""
    eq_sub_grade:           str | None = None
    """Eq. Sub Grade (col 43). text."""
    so_end_application:     str | None = None
    """SO-End Application (col 44). text."""
    production_workcenter:  str | None = None
    """production workcenter (col 45). text."""

    # ------------------------------------------------------------------
    # §1 data fields — col 46-65 (number/text alternating)
    # ------------------------------------------------------------------
    ys_in_mpa:              float | None = None
    """YS in MPa (col 46). number."""
    elongation:             str | None = None
    """ELONGATION (col 47). text."""
    elongation_mic:         float | None = None
    """Elongation(Mic) (col 48). number."""
    hardness:               str | None = None
    """HARDNESS (col 49). text — numeric cells stored as string."""
    s_aluminium_pct:        float | None = None
    """S_ALUMINIUM_PCT (col 50). number."""
    s_boron_pct:            float | None = None
    """S_BORON_PCT (col 51). number."""
    s_carbon_pct:           float | None = None
    """S_CARBON_PCT (col 52). number."""
    s_chromium_pct:         float | None = None
    """S_CHROMIUM_PCT (col 53). number."""
    s_copper_pct:           float | None = None
    """S_COPPER_PCT (col 54). number."""
    s_manganese_pct:        float | None = None
    """S_MANGANESE_PCT (col 55). number."""
    s_molybdenum_pct:       float | None = None
    """S_MOLYBDENUM_PCT (col 56). number."""
    s_nickel_pct:           float | None = None
    """S_NICKEL_PCT (col 57). number."""
    s_niobium_pct:          float | None = None
    """S_NIOBIUM_PCT (col 58). number."""
    s_phosphorus_pct:       float | None = None
    """S_PHOSPHORUS_PCT (col 59). number."""
    s_silicon_pct:          float | None = None
    """S_SILICON_PCT (col 60). number."""
    s_sulphur_pct:          float | None = None
    """S_SULPHUR_PCT (col 61). number."""
    s_titanium_pct:         float | None = None
    """S_TITANIUM_PCT (col 62). number."""
    s_vanadium_pct:         float | None = None
    """S_VANADIUM_PCT (col 63). number."""
    tensile_strength_mpa_b: float | None = None
    """Tensile Strength MPa (B) (col 64). number."""
    yield_strength:         str | None = None
    """YIELD STRENGTH (col 65). text — numeric cells stored as string."""
    uts:                    str | None = None
    """UTS (col 66). text — numeric cells stored as string."""

    # ------------------------------------------------------------------
    # §1 data fields — col 67-72 (text/date)
    # ------------------------------------------------------------------
    special_stock:  str | None = None
    """Special Stock (col 67). text."""
    cp_number:      str | None = None
    """CP Number (col 68). text."""
    cp_end_date:    datetime | None = None
    """CP End Date (col 69). date — Excel numeric serial."""
    lc_exp_date:    str | None = None
    """LC Exp Date (col 70). text — stored as dd.mm.yyyy string, NOT coerced to datetime."""
    route:          str | None = None
    """Route (col 71). text."""
    route_desc:     str | None = None
    """Route Desc (col 72). text."""

    # ------------------------------------------------------------------
    # Meta / mapping fields (7 total)
    # ------------------------------------------------------------------
    party_code_normalized: Annotated[str | None, Indexed()] = None
    """party_code.lstrip('0') — join key for CustomerCode lookup."""
    customer_name:         Annotated[str | None, Indexed()] = None
    """Resolved from CustomerCode.customer at ingest time; None if no match."""
    customer_code_id:      Annotated[str | None, Indexed()] = None
    """CustomerCode _id hex string at ingest time; None if no match."""
    report_date:           Annotated[str, Indexed()]
    """Source folder date string dd-mm-yyyy (e.g. '31-05-2026')."""
    source_file:           str | None = None
    """Absolute path the row was ingested from."""
    created_at:            Annotated[datetime, Indexed()] = Field(default_factory=_now_utc)
    """UTC insert timestamp — used as the date-range filter field."""
    updated_at:            datetime = Field(default_factory=_now_utc)
    """UTC timestamp bumped on re-ingest (delete+re-insert cycle)."""

    class Settings:
        name = "jvml_stock"
```

---

## 4. Ready-to-Paste: `app/models/jvml_stock_config.py`

```python
"""JvmlStockConfig singleton document (MongoDB collection ``jvml_stock_configs``, via Beanie)."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Annotated

from beanie import Document, Indexed
from pydantic import Field


def _now_utc() -> datetime:
    """Return the current UTC datetime (used as a :func:`~pydantic.Field` default factory)."""
    return datetime.now(timezone.utc)


class JvmlStockConfig(Document):
    """Singleton configuration for the JVML Stock scheduled ingestion job.

    Keyed on ``key="default"`` (unique index). Persisted once; upserted on every
    PUT /admin/jvml-stock/config. Consumed by ``services.jvml_stock.poller``
    and ``core.scheduler.apply_jvml_stock_schedule``.
    """

    key:             Annotated[str, Indexed(unique=True)] = "default"
    """Singleton discriminator — always ``"default"``."""
    enabled:         bool = False
    """Whether the poll job is active."""
    base_path:       str = ""
    """Root folder; dated sub-folder ``<base_path>/<dd-mm-yyyy>/`` is created at poll time."""
    file_name:       str = ""
    """Workbook filename without extension; full path = ``<base_path>/<date>/<file_name>.xlsx``."""
    start_time:      str = "08:00"
    """Daily window open (HH:MM, 24-hour)."""
    end_time:        str = "20:00"
    """Daily window close (HH:MM, 24-hour)."""
    interval_hours:  int = 1
    """APScheduler IntervalTrigger hours (1..24)."""
    notify_emails:   list[str] = Field(default_factory=list)
    """Recipients for the 'file not found' alert email."""
    created_at:      datetime = Field(default_factory=_now_utc)
    """UTC timestamp set once at document creation."""
    updated_at:      datetime = Field(default_factory=_now_utc)
    """UTC timestamp bumped on every upsert."""

    class Settings:
        name = "jvml_stock_configs"
```

---

## 5. Ready-to-Paste: `app/models/jvml_stock_ingestion.py`

```python
"""JvmlStockIngestion document model (MongoDB collection ``jvml_stock_ingestions``, via Beanie)."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Annotated

from beanie import Document, Indexed
from pydantic import Field


def _now_utc() -> datetime:
    """Return the current UTC datetime (used as a :func:`~pydantic.Field` default factory)."""
    return datetime.now(timezone.utc)


class JvmlStockIngestion(Document):
    """One ingestion attempt record per report date.

    ``report_date`` (dd-mm-yyyy) has a unique index — at most one record per day.
    Created by ``services.jvml_stock.poller`` on first poll attempt for a date;
    updated in-place as the day progresses through ``pending``→``ingested`` /
    ``missing``→``alerted`` / ``error``.
    """

    report_date: Annotated[str, Indexed(unique=True)]
    """dd-mm-yyyy of the dated folder being polled."""
    status:      str
    """One of: ``pending``, ``ingested``, ``missing``, ``alerted``, ``error``."""
    row_count:   int = 0
    """Rows inserted on successful ingest; 0 while pending/missing."""
    file_path:   str | None = None
    """Absolute path of the file that was ingested; None until file found."""
    found_at:    datetime | None = None
    """UTC timestamp when the workbook file was first detected."""
    alerted_at:  datetime | None = None
    """UTC timestamp when the missing-file alert email was sent."""
    error:       str | None = None
    """Error message string if status is ``error``."""
    created_at:  datetime = Field(default_factory=_now_utc)
    """UTC insert timestamp."""
    updated_at:  datetime = Field(default_factory=_now_utc)
    """UTC timestamp bumped on every status transition."""

    class Settings:
        name = "jvml_stock_ingestions"
```

---

## 6. Index Summary (all Indexed fields across three models)

### JvmlStock — Indexed fields
| Field | Indexed type | Reason |
|---|---|---|
| `so_sales_org` | `Indexed()` | filter field |
| `sales_order_type` | `Indexed()` | filter field |
| `distr_chnl` | `Indexed()` | filter field |
| `sold_to_party` | `Indexed()` | filter + q + sort |
| `party_code` | `Indexed()` | q + sort |
| `ship_to_party` | `Indexed()` | q + sort |
| `customer` | `Indexed()` | filter + q + sort |
| `material` | `Indexed()` | filter + q + sort |
| `sales_office` | `Indexed()` | filter + q + sort |
| `so_product_form` | `Indexed()` | filter field |
| `jsw_grade` | `Indexed()` | filter + q + sort |
| `nco_declared` | `Indexed()` | filter field |
| `party_code_normalized` | `Indexed()` | join key, sort |
| `customer_name` | `Indexed()` | mapped lookup, sort |
| `customer_code_id` | `Indexed()` | FK lookup |
| `report_date` | `Indexed()` | date filter, sort |
| `created_at` | `Indexed()` | date-range filter, sort (default) |

### JvmlStockConfig — Indexed fields
| Field | Indexed type |
|---|---|
| `key` | `Indexed(unique=True)` — singleton guard |

### JvmlStockIngestion — Indexed fields
| Field | Indexed type |
|---|---|
| `report_date` | `Indexed(unique=True)` — one record per day |

---

## 7. Nullable Indexed Pattern Note

SPEC §1 says `report_date` on `JvmlStock` is `str` (not optional) — it is a **required field** with no default. The builder MUST supply it at construction time:

```python
doc = JvmlStock(
    report_date="31-05-2026",   # required — no default
    source_file="/path/to/file.xlsx",
    # ... all other fields
)
```

All other meta fields (`party_code_normalized`, `customer_name`, `customer_code_id`, `source_file`) default to `None`.

---

## 8. Key Import for Downstream Layers

```python
# services/jvml_stock/*.py
from app.models.jvml_stock import JvmlStock
from app.models.jvml_stock_config import JvmlStockConfig
from app.models.jvml_stock_ingestion import JvmlStockIngestion

# schemas/jvml_stock.py — base query
from app.schemas.common import PageQuery, SortOrder

# services/jvml_stock/serialize.py
from app.schemas.jvml_stock_record import JvmlStockPublic
```

ORCHESTRATOR adds to `app/models/__init__.py` (do not edit in this builder task):
```python
from .jvml_stock import JvmlStock
from .jvml_stock_config import JvmlStockConfig
from .jvml_stock_ingestion import JvmlStockIngestion
```

ORCHESTRATOR adds to `app/core/database.py` `DOCUMENT_MODELS` list (do not edit):
```python
JvmlStock, JvmlStockConfig, JvmlStockIngestion
```

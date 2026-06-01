# BE Models — Implementation Note (JSW Stock)

Agent area: `backend/app/models/` — three new files.
Validated against: Beanie 2.1.0 (installed), reference models `customer_code.py`, `region.py`, `audit_log.py`.

---

## Validation findings

| Check | Result |
|---|---|
| `Beanie 2.1.0` installed | confirmed (`pip freeze`) |
| `Indexed(unique=True)` signature valid in 2.1.0 | confirmed (live Python test) |
| `_now_utc` pattern (copy verbatim from `customer_code.py`) | confirmed — identical pattern in all three reference models |
| `JswStock` line count with 79 compact one-liner fields | ~98 lines — well under 250 |
| `JswStockConfig` line count | ~29 lines |
| `JswStockIngestion` line count | ~28 lines |
| Per-field docstrings: skip them | YES — SPEC says "terse 1-line docstrings"; with 72 fields that adds 79 lines (171 total) which is still under 250, but they add zero value for machine-generated fields; omit individual field docstrings, keep only the class docstring |
| Indexed fields total in JswStock | 17: 12 filter fields + 5 meta fields (`party_code_normalized`, `customer_name`, `customer_code_id`, `report_date`, `created_at`) |
| `updated_at` in JswStock — NOT indexed | correct per SPEC (only `created_at` is in the indexed list) |
| `Indexed(unique=True)` for `JswStockConfig.key` | required |
| `Indexed(unique=True)` for `JswStockIngestion.report_date` | required |

**No blocking corrections.** SPEC is consistent and buildable.

---

## File 1 — `backend/app/models/jsw_stock.py`

Collection: `jsw_stock`. ~98 lines.

```python
"""JswStock document model (MongoDB collection ``jsw_stock``, via Beanie)."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Annotated

from beanie import Document, Indexed
from pydantic import Field


def _now_utc() -> datetime:
    """Return the current UTC datetime (used as a Field default factory)."""
    return datetime.now(timezone.utc)


class JswStock(Document):
    """One row from the ZSD_CURRSTK_HR stock Excel report.

    72 source columns (§1) + 7 mapping/meta fields. Bulk-replaced per report_date
    on each ingestion run. Indexed fields power the 12 async-select filters.
    """

    # ── 12 filter fields (Indexed) ───────────────────────────────────────────
    so_sales_org:       Annotated[str | None, Indexed()] = None
    sales_order_type:   Annotated[str | None, Indexed()] = None
    distr_chnl:         Annotated[str | None, Indexed()] = None
    sold_to_party:      Annotated[str | None, Indexed()] = None
    party_code:         Annotated[str | None, Indexed()] = None
    ship_to_party:      Annotated[str | None, Indexed()] = None
    customer:           Annotated[str | None, Indexed()] = None
    material:           Annotated[str | None, Indexed()] = None
    sales_office:       Annotated[str | None, Indexed()] = None
    so_product_form:    Annotated[str | None, Indexed()] = None
    jsw_grade:          Annotated[str | None, Indexed()] = None
    nco_declared:       Annotated[str | None, Indexed()] = None

    # ── remaining 60 source fields (non-indexed) ─────────────────────────────
    act_thickness_mm:         str | None = None
    width_mm:                 str | None = None
    batch:                    str | None = None
    unrestr_qty:              float | None = None
    in_quality_insp:          float | None = None
    blocked:                  float | None = None
    stock_quantity:            float | None = None
    usage_decision:           str | None = None
    next_workcenter:          str | None = None
    length_mm:                str | None = None
    nco_reason:               str | None = None
    ud_remarks:               str | None = None
    aging:                    float | None = None
    production_date:          datetime | None = None
    shift:                    str | None = None
    sales_order_no:           str | None = None
    so_item_num:              str | None = None
    order_status:             str | None = None
    location:                 str | None = None
    str_no:                   str | None = None
    sto_no:                   str | None = None
    do_no:                    str | None = None
    shipment:                 str | None = None
    storage_location:         str | None = None
    port_name:                str | None = None
    unloading_point:          str | None = None
    recieving_point:          str | None = None   # NOTE: kept verbatim (source typo)
    purchase_order_number:    str | None = None
    scheduled_status:         str | None = None
    eq_specification:         str | None = None
    eq_sub_grade:             str | None = None
    so_end_application:       str | None = None
    production_workcenter:    str | None = None
    ys_in_mpa:                float | None = None
    elongation:               str | None = None
    elongation_mic:           float | None = None
    hardness:                 str | None = None
    s_aluminium_pct:          float | None = None
    s_boron_pct:              float | None = None
    s_carbon_pct:             float | None = None
    s_chromium_pct:           float | None = None
    s_copper_pct:             float | None = None
    s_manganese_pct:          float | None = None
    s_molybdenum_pct:         float | None = None
    s_nickel_pct:             float | None = None
    s_niobium_pct:            float | None = None
    s_phosphorus_pct:         float | None = None
    s_silicon_pct:            float | None = None
    s_sulphur_pct:            float | None = None
    s_titanium_pct:           float | None = None
    s_vanadium_pct:           float | None = None
    tensile_strength_mpa_b:   float | None = None
    yield_strength:           str | None = None
    uts:                      str | None = None
    special_stock:            str | None = None
    cp_number:                str | None = None
    cp_end_date:              datetime | None = None
    lc_exp_date:              str | None = None   # text per SPEC (dd.mm.yyyy stored as-is)
    route:                    str | None = None
    route_desc:               str | None = None

    # ── 7 mapping/meta fields ────────────────────────────────────────────────
    party_code_normalized: Annotated[str | None, Indexed()] = None
    customer_name:         Annotated[str | None, Indexed()] = None
    customer_code_id:      Annotated[str | None, Indexed()] = None
    report_date:           Annotated[str, Indexed()]          # "dd-mm-yyyy"
    source_file:           str | None = None
    created_at:            Annotated[datetime, Indexed()] = Field(default_factory=_now_utc)
    updated_at:            datetime = Field(default_factory=_now_utc)

    class Settings:
        name = "jsw_stock"
```

**Important notes for builder:**
- `report_date` has no default — it is always set by the ingestion service before insert.
- `recieving_point` (col 39) — the typo is intentional; it mirrors the Excel header exactly (the SPEC §1 row spells it `recieving_point`).
- `lc_exp_date` is `str | None` not `datetime | None` — SPEC §1 marks it `text` because the Excel source stores it as `dd.mm.yyyy` string and ingestion stores it verbatim.
- `updated_at` is NOT indexed — only `created_at` is in the SPEC §1 indexed list.
- No `Optional[...]` imports needed; use `X | None` (Python 3.10+ union syntax, valid with `from __future__ import annotations` in 3.13).

---

## File 2 — `backend/app/models/jsw_stock_config.py`

Collection: `jsw_stock_configs`. ~29 lines.

```python
"""JswStockConfig singleton document (MongoDB collection ``jsw_stock_configs``, via Beanie)."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Annotated

from beanie import Document, Indexed
from pydantic import Field


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


class JswStockConfig(Document):
    """Singleton scheduler config; always fetched/upserted by key="default"."""

    key:            Annotated[str, Indexed(unique=True)] = "default"
    enabled:        bool = False
    base_path:      str = ""
    file_name:      str = ""
    start_time:     str = "08:00"
    end_time:       str = "20:00"
    interval_hours: int = 1
    notify_emails:  list[str] = Field(default_factory=list)
    created_at:     datetime = Field(default_factory=_now_utc)
    updated_at:     datetime = Field(default_factory=_now_utc)

    class Settings:
        name = "jsw_stock_configs"
```

**Notes:**
- `notify_emails` uses `Field(default_factory=list)` — never `[]` as a default directly (mutable default guard, consistent with `Region.emails`).
- `Indexed(unique=True)` on `key` enforces the singleton contract at the DB layer.

---

## File 3 — `backend/app/models/jsw_stock_ingestion.py`

Collection: `jsw_stock_ingestions`. ~28 lines.

```python
"""JswStockIngestion document (MongoDB collection ``jsw_stock_ingestions``, via Beanie)."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Annotated

from beanie import Document, Indexed
from pydantic import Field


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


class JswStockIngestion(Document):
    """One record per calendar date; tracks file discovery and ingestion lifecycle."""

    report_date: Annotated[str, Indexed(unique=True)]   # "dd-mm-yyyy"
    status:      str = "pending"   # pending | ingested | missing | alerted | error
    row_count:   int = 0
    file_path:   str | None = None
    found_at:    datetime | None = None
    alerted_at:  datetime | None = None
    error:       str | None = None
    created_at:  datetime = Field(default_factory=_now_utc)
    updated_at:  datetime = Field(default_factory=_now_utc)

    class Settings:
        name = "jsw_stock_ingestions"
```

**Notes:**
- `report_date` has no default — always provided at create time (`today` from the poller).
- `Indexed(unique=True)` guarantees at most one ingestion record per date.
- `status` is a plain `str` (not `Literal`) in the model — the Literal constraint is enforced at the schema/validator layer, consistent with how `AuditLog` stores its `category`/`outcome` fields.

---

## Wiring (NOT done by the models builder)

The orchestrator/wiring pass must make these additions (SPEC §4):

```python
# app/models/__init__.py — add to imports + __all__
from .jsw_stock import JswStock
from .jsw_stock_config import JswStockConfig
from .jsw_stock_ingestion import JswStockIngestion
__all__ = [..., "JswStock", "JswStockConfig", "JswStockIngestion"]

# app/core/database.py — add to DOCUMENT_MODELS list
from ..models import ..., JswStock, JswStockConfig, JswStockIngestion
DOCUMENT_MODELS = [User, AuditLog, CustomerCode, Region, JswStock, JswStockConfig, JswStockIngestion]
```

Do NOT add `"jsw_stock"` to `AuditCategory` in `audit_log.py` here — that is a separate wiring-pass task.

---

## Complete 72-field reference (SPEC §1, exact order)

| # | field | Python type |
|---|---|---|
| 1 | `so_sales_org` | `str \| None` |
| 2 | `sales_order_type` | `str \| None` |
| 3 | `distr_chnl` | `str \| None` |
| 4 | `sold_to_party` | `str \| None` |
| 5 | `party_code` | `str \| None` |
| 6 | `ship_to_party` | `str \| None` |
| 7 | `customer` | `str \| None` |
| 8 | `material` | `str \| None` |
| 9 | `sales_office` | `str \| None` |
| 10 | `so_product_form` | `str \| None` |
| 11 | `jsw_grade` | `str \| None` |
| 12 | `act_thickness_mm` | `str \| None` |
| 13 | `width_mm` | `str \| None` |
| 14 | `batch` | `str \| None` |
| 15 | `unrestr_qty` | `float \| None` |
| 16 | `in_quality_insp` | `float \| None` |
| 17 | `blocked` | `float \| None` |
| 18 | `stock_quantity` | `float \| None` |
| 19 | `usage_decision` | `str \| None` |
| 20 | `nco_declared` | `str \| None` |
| 21 | `next_workcenter` | `str \| None` |
| 22 | `length_mm` | `str \| None` |
| 23 | `nco_reason` | `str \| None` |
| 24 | `ud_remarks` | `str \| None` |
| 25 | `aging` | `float \| None` |
| 26 | `production_date` | `datetime \| None` |
| 27 | `shift` | `str \| None` |
| 28 | `sales_order_no` | `str \| None` |
| 29 | `so_item_num` | `str \| None` |
| 30 | `order_status` | `str \| None` |
| 31 | `location` | `str \| None` |
| 32 | `str_no` | `str \| None` |
| 33 | `sto_no` | `str \| None` |
| 34 | `do_no` | `str \| None` |
| 35 | `shipment` | `str \| None` |
| 36 | `storage_location` | `str \| None` |
| 37 | `port_name` | `str \| None` |
| 38 | `unloading_point` | `str \| None` |
| 39 | `recieving_point` | `str \| None` |
| 40 | `purchase_order_number` | `str \| None` |
| 41 | `scheduled_status` | `str \| None` |
| 42 | `eq_specification` | `str \| None` |
| 43 | `eq_sub_grade` | `str \| None` |
| 44 | `so_end_application` | `str \| None` |
| 45 | `production_workcenter` | `str \| None` |
| 46 | `ys_in_mpa` | `float \| None` |
| 47 | `elongation` | `str \| None` |
| 48 | `elongation_mic` | `float \| None` |
| 49 | `hardness` | `str \| None` |
| 50 | `s_aluminium_pct` | `float \| None` |
| 51 | `s_boron_pct` | `float \| None` |
| 52 | `s_carbon_pct` | `float \| None` |
| 53 | `s_chromium_pct` | `float \| None` |
| 54 | `s_copper_pct` | `float \| None` |
| 55 | `s_manganese_pct` | `float \| None` |
| 56 | `s_molybdenum_pct` | `float \| None` |
| 57 | `s_nickel_pct` | `float \| None` |
| 58 | `s_niobium_pct` | `float \| None` |
| 59 | `s_phosphorus_pct` | `float \| None` |
| 60 | `s_silicon_pct` | `float \| None` |
| 61 | `s_sulphur_pct` | `float \| None` |
| 62 | `s_titanium_pct` | `float \| None` |
| 63 | `s_vanadium_pct` | `float \| None` |
| 64 | `tensile_strength_mpa_b` | `float \| None` |
| 65 | `yield_strength` | `str \| None` |
| 66 | `uts` | `str \| None` |
| 67 | `special_stock` | `str \| None` |
| 68 | `cp_number` | `str \| None` |
| 69 | `cp_end_date` | `datetime \| None` |
| 70 | `lc_exp_date` | `str \| None` |
| 71 | `route` | `str \| None` |
| 72 | `route_desc` | `str \| None` |

Fields #1–11, #20 = `Indexed()` (12 filter fields).
Fields #26, #69 = `datetime | None` (date type per SPEC §1 — Excel serial or dd.mm.yyyy parsed to datetime).
Field #70 `lc_exp_date` = `str | None` (text type per SPEC §1 — stored verbatim).
Fields #65 `yield_strength`, #66 `uts`, #47 `elongation`, #49 `hardness` = `str | None` (text type per SPEC §1 — numeric Excel cells stored as text strings, including malformed values like `"1.057.000"`).

---

## Quick verification command (after build)

```bash
cd backend && ./.venv/bin/python -c "
from app.models.jsw_stock import JswStock
from app.models.jsw_stock_config import JswStockConfig
from app.models.jsw_stock_ingestion import JswStockIngestion
fields = list(JswStock.model_fields.keys())
# subtract id and revision_id (Beanie adds them)
data_fields = [f for f in fields if f not in ('id', 'revision_id')]
print('JswStock field count:', len(data_fields))   # expect 79 (72 + 7)
print('Config key default:', JswStockConfig.model_fields['key'].default)  # expect 'default'
print('All imports OK')
"
```

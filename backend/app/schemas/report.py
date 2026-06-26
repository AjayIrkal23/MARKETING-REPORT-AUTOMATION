"""Report JSW/JVML request/response DTOs.

Contract for ``GET /report/generate`` — a "Coil Stock" RAKE pivot for a date +
report type + region. Stock rows are grouped by SO Sales Org → Distr. Channel →
Sold To Party → Sales Office (BRANCH) → Party Code → Ship-To Party, then
enriched with CustomerCode master fields (Transport Mode, Destination, ROUTE).
RAKE values from CustomerCode become dynamic column headers; the value is the
sum of stock_quantity for that RAKE. Credit-report checks are kept unchanged.

See ``.planning/report-jsw-jvml/SPEC.md`` for the full algorithm.
"""

from __future__ import annotations

from pydantic import BaseModel, Field
from typing import Literal

# Report type → stock collection + credit control areas:
#   jsw  → jsw_stock  + CCAs ["VJ0H", "1000"]
#   jvml → jvml_stock + CCA ["JV0H"]
ReportType = Literal["jsw", "jvml"]
# Toolbar/query selection. "both" merges jsw + jvml into one response, grouped by
# SO Sales Org (each stock model is still queried as its own ReportType internally).
ReportTypeSelection = Literal["jsw", "jvml", "both"]

# QA-hold aging day-filter, defined around "aged QA-hold" stock =
# in_quality_insp > 0 AND round(aging) > 2 (aging rounded to whole days, 2.4→2,
# 2.6→3). Normal non-QA stock is never "aged QA-hold".
#   include → no filter (all stock)
#   exclude → everything EXCEPT aged QA-hold (all normal data + QA-hold ≤ 2 days)
#   only    → ONLY aged QA-hold (in_quality_insp > 0 AND round(aging) > 2)
DaysFilter = Literal["include", "exclude", "only"]

# Credit-status sentinels rendered verbatim by the frontend.
CreditStatus = Literal["", "No Credit balance", "NO CREDIT REPORT FOUND"]


class ReportQuery(BaseModel):
    """Query params for ``GET /report/generate`` (used via FastAPI ``Depends()``)."""

    date: str = Field(pattern=r"^\d{2}-\d{2}-\d{4}$")
    report_type: ReportTypeSelection
    region_id: str | None = Field(default=None, max_length=64)
    days: DaysFilter = "include"
    # Export only: CSV of visible optional-column keys (e.g. "total,route,blocked").
    # None ⇒ every optional column; "" ⇒ none. Ignored by /generate.
    columns: str | None = Field(default=None, max_length=256)


class CombinedExportQuery(ReportQuery):
    """Query params for ``GET /report/export-combined`` (via FastAPI ``Depends()``).

    The report export params plus ``sheets`` — a CSV of which sheets to include
    (subset of pivot, rake_totals, rake_merged, rake_unmerged, jsw, jvml, credit).
    Value validation (unknown / empty keys) happens in the combined service.
    """

    sheets: str = Field(min_length=1, max_length=128)


class RakeExclusion(BaseModel):
    """One RAKE's user-unchecked drill-down rows (export-only, transient).

    ``keys`` — canonical 8-field identity strings (see ``rake_drilldown.row_identity``,
    mirrored by the frontend ``rake-exclusions.ts::rowKey``) of rows to OMIT from the
    rake_merged / rake_unmerged breakdown sheets. ``subtract`` — quantity to subtract
    from this RAKE's TOTAL RAKE REPORT figure (stock-type-scoped, computed client-side).
    Nothing is persisted; this only shapes one export.
    """

    keys: list[str] = Field(default_factory=list, max_length=10000)
    subtract: float = 0.0


class CombinedExportBody(BaseModel):
    """Optional POST body for ``/report/export-combined`` — per-export RAKE exclusions.

    ``exclusions`` maps RAKE → its excluded rows (subtract from the RAKE totals +
    drop from the breakdown sheets). ``transport_subtract`` maps transport mode →
    the same unchecks' qty (subtract from the TRANSPORT MODE TOTAL sheet). Both
    empty/absent ⇒ no exclusions (GET-equivalent file).
    """

    exclusions: dict[str, RakeExclusion] = Field(default_factory=dict)
    transport_subtract: dict[str, float] = Field(default_factory=dict)


class ReportPivotRow(BaseModel):
    """One row of the RAKE pivot report."""

    so_sales_org: str | None
    distr_chnl: str | None
    sold_to_party: str | None
    sales_office: str | None       # rendered as BRANCH
    party_code: str                # normalized display code
    ship_to_party: str | None
    transport_mode: str | None     # from CustomerCode.transport_mode
    destination: str | None        # from CustomerCode.destination
    route: str | None              # from CustomerCode.route
    rake_quantities: dict[str, float] = {}  # { "KKU": 55.01, "ROAD": 0, ... }
    total: float                   # Σ stock_quantity for this row
    nco_yes_do: float              # Σ stock_quantity where nco_declared == "Yes"
    nco_yes_do_count: int          # # rows where nco_declared == "Yes"
    blocked: bool | None           # credit Blocked flag; None = no credit data
    credit_balance: float | None   # SAP credit headroom; None = not in credit report
    required_credit: float | None  # (total - nco_yes_do) * coil_price_per_qty
    credit_sufficient: bool | None # credit_balance >= required_credit (None if either missing)
    credit_status: CreditStatus    # "" | "No Credit balance" | "NO CREDIT REPORT FOUND"
    credit_note: str               # verdict label


class RakeDrilldownQuery(BaseModel):
    """Query params for ``GET /report/rake-drilldown`` (via FastAPI ``Depends()``).

    Reverse-resolves a single RAKE to the individual jsw + jvml stock rows that
    make up its total. Always queries BOTH stock collections (the report's
    ``report_type`` is irrelevant here — the drill-down is union jsw + jvml).
    """

    rake: str = Field(min_length=1, max_length=64)
    date: str = Field(pattern=r"^\d{2}-\d{2}-\d{4}$")
    region_id: str | None = Field(default=None, max_length=64)
    days: DaysFilter = "include"


class RakeDrilldownRow(BaseModel):
    """One individual stock row contributing to a RAKE total."""

    stock_type: ReportType         # "jsw" | "jvml" — which collection it came from
    so_sales_org: str | None       # Sales Org
    distr_chnl: str | None         # Distr Channel
    sold_to_party: str | None      # Sold to party
    sales_office: str | None       # rendered as BRANCH
    party_code: str | None         # normalized display code
    ship_to_party: str | None      # Ship to party
    transport_mode: str | None     # from CustomerCode.transport_mode
    destination: str | None        # from CustomerCode.destination
    customer_name: str | None      # mapped customer (for readability)
    stock_quantity: float          # this row's quantity


class RakeDrilldownMergedRow(BaseModel):
    """A merged drill-down row: the 8-field business identity + summed quantity.

    Source (stock_type) and Ship To Party are intentionally absent — they are not
    part of the merge key and can vary within a merged group.
    """

    so_sales_org: str | None       # Sales Org
    distr_chnl: str | None         # Distr Channel
    sales_office: str | None       # rendered as BRANCH
    sold_to_party: str | None      # Sold to party
    party_code: str | None         # normalized display code
    transport_mode: str | None     # from CustomerCode.transport_mode
    destination: str | None        # from CustomerCode.destination
    customer_name: str | None      # mapped customer
    stock_quantity: float          # Σ stock_quantity for the merged group


class RakeDrilldownResponse(BaseModel):
    """RAKE drill-down payload — individual jsw + jvml rows for one RAKE."""

    rake: str
    date: str
    region_id: str | None
    region_name: str
    days_filter: DaysFilter
    rows: list[RakeDrilldownRow]
    merged_rows: list[RakeDrilldownMergedRow] = []  # rows collapsed by 8-field identity
    total_quantity: float


class ReportResponse(BaseModel):
    """Full report payload — the ``data`` inside the success envelope."""

    date: str
    report_type: ReportTypeSelection  # "both" ⇒ merged jsw + jvml, grouped by SO Sales Org
    region_id: str | None
    region_name: str               # resolved name, or "All Regions"
    days_filter: DaysFilter
    ccas: list[str]               # e.g. ["VJ0H", "1000"] (jsw) / ["JV0H"] (jvml)
    has_stock: bool                # False → "No stock excel for this date selected"
    has_credit_report: bool        # False → all credit columns "NO CREDIT REPORT FOUND"
    coil_price_per_qty: float | None
    rake_columns: list[str]        # sorted unique RAKE values for this report
    rows: list[ReportPivotRow]
    grand_total: float
    grand_nco_yes_do: float
    grand_required_credit: float | None
    rake_totals: dict[str, float] = {}          # RAKE → Σ stock_quantity
    transport_mode_totals: dict[str, float] = {}  # transport_mode → Σ stock_quantity

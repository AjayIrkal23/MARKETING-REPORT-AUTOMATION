"""Report JSW/JVML request/response DTOs.

Contract for ``GET /report/generate`` — a "Coil Stock" pivot (Sum of Stock
Quantity grouped by Distr.Chnl → Party Code) for a date + report type + region,
augmented with NCO-Yes+DO, credit-report Blocked, the SAP Credit Balance
headroom, and a service-computed Required Credit.

See ``.planning/report-jsw-jvml/SPEC.md`` (+ AUDIT.md) for the full algorithm.
"""

from __future__ import annotations

from pydantic import BaseModel, Field
from typing import Literal

# Report type → stock collection + credit control areas:
#   jsw  → jsw_stock  + CCAs ["VJ0H", "1000"]
#   jvml → jvml_stock + CCA ["JV0H"]
ReportType = Literal["jsw", "jvml"]

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
    report_type: ReportType
    region_id: str | None = Field(default=None, max_length=64)
    days: DaysFilter = "include"


class ReportParty(BaseModel):
    """One party row inside a distribution-channel group."""

    party_code: str                 # normalized display code ("40122581" / "8481")
    sold_to_party: str | None
    ship_to_party: str | None       # from CustomerCode.ship_to_customer (+ ship_to fallback)
    route: str | None               # from CustomerCode.route
    route_desc: str | None
    rake: str | None                # from CustomerCode.rake
    transport_mode: str | None      # from CustomerCode.transport_mode
    total: float                    # Σ stock_quantity for this party
    nco_yes_do: float               # Σ stock_quantity where nco_declared == "Yes"
    nco_yes_do_count: int           # # rows where nco_declared == "Yes"
    blocked: bool | None            # credit Blocked flag; None = no credit data
    credit_balance: float | None    # SAP credit headroom; None = not in credit report
    required_credit: float | None   # (total - nco_yes_do) * coil_price_per_qty
    credit_sufficient: bool | None  # credit_balance >= required_credit (None if either missing)
    credit_status: CreditStatus     # "" | "No Credit balance" | "NO CREDIT REPORT FOUND"
    credit_note: str                # verdict label: Balance Available / Not Enough Balance /
    #                                 Balance Negative / No Credit balance / NO CREDIT REPORT FOUND


class ReportChannel(BaseModel):
    """A distribution-channel group with its parties and subtotals."""

    distr_chnl: str                 # "Unspecified" when the source value is null
    parties: list[ReportParty]
    subtotal: float
    subtotal_nco_yes_do: float
    subtotal_required_credit: float | None


class ReportResponse(BaseModel):
    """Full report payload — the ``data`` inside the success envelope."""

    date: str
    report_type: ReportType
    region_id: str | None
    region_name: str                # resolved name, or "All Regions"
    days_filter: DaysFilter
    ccas: list[str]                # e.g. ["VJ0H", "1000"] (jsw) / ["JV0H"] (jvml)
    has_stock: bool                 # False → "No stock excel for this date selected"
    has_credit_report: bool         # False → all credit columns "NO CREDIT REPORT FOUND"
    coil_price_per_qty: float | None
    channels: list[ReportChannel]
    grand_total: float
    grand_nco_yes_do: float
    grand_required_credit: float | None

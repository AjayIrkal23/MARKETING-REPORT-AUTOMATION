"""Dashboard summary DTOs — per-report ingestion status for a single day.

The dashboard landing page shows one card per scheduled-ingestion domain
(JSW Stock, JVML Stock, Credit Report). Each card reflects *today's* ingestion
state, derived from that domain's ``{domain}_ingestions`` record for the local
calendar date (``report_date``, ``dd-mm-yyyy``).

``extracted`` / ``missing`` are computed server-side from the raw ingestion
``status`` so the frontend renders state without re-deriving business rules
(``api-contract-standards``: the contract carries decisions, not raw enums only).
"""

from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

# Keys mirror the audit-category / collection naming for the three domains.
DashboardReportKey = Literal["jsw_stock", "jvml_stock", "credit_report"]


class DashboardZoneStatus(BaseModel):
    """Today's credit-report status for one active region zone."""

    region_id: str
    name: str
    status: str
    row_count: int
    found_at: datetime | None


class DashboardReportStatus(BaseModel):
    """Today's ingestion state for one report domain (one dashboard card)."""

    key: DashboardReportKey
    label: str                       # human label, e.g. "JSW Stock Excel"
    report_date: str                 # today's "dd-mm-yyyy" (local clock)
    status: str                      # none|pending|ingested|missing|alerted|error
    extracted: bool                  # status == "ingested"
    missing: bool                    # status in {missing, alerted}
    row_count: int                   # rows ingested today (0 when not ingested)
    found_at: datetime | None        # when today's file was found/ingested
    enabled: bool                    # whether scheduled polling is enabled
    zones: list[DashboardZoneStatus] = Field(default_factory=list)


class DashboardSummary(BaseModel):
    """Per-report ingestion status for today — drives the dashboard cards."""

    date: str                        # today's "dd-mm-yyyy" (local clock)
    reports: list[DashboardReportStatus]

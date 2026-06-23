"""Credit Report request/response DTOs — list, options, and sort/filter literals.

Mirrors schemas/jvml_stock.py pattern (jvml_stock -> credit_report rename).
AsyncOption imported exclusively from .admin_user (same rule as jvml_stock).

Filter surface (7 filters total):
  - ``date``: single report date, ``"dd-mm-yyyy"`` — exact match on ``report_date``.
  - 4 per-field async-select filters (customer_name, city, customer, cca_description).
  - ``blocked``: enum filter ("blocked"/"unblocked") — maps "X" / None in the DB.
  - ``credit_balance_sign``: enum filter ("positive"/"negative") — numeric sign gate.
  - ``plant``: enum filter ("jsw"/"jvml"/"all") — groups credit control areas.
"""
from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

from .admin_user import AsyncOption  # noqa: F401 — re-export for controller layer
from .common import PageQuery

# ---------------------------------------------------------------------------
# Sort key whitelist (Literal → unknown values rejected at parse time)
# ---------------------------------------------------------------------------

CreditReportSortBy = Literal[
    "created_at",
    "report_date",
    "customer_name",
    "city",
    "customer",
    "credit_control_area",
    "cca_description",
    "blocked",
    "cca_credit_limit",
    "credit_exposure",
    "credit_balance",
    "overdue",
    "total_receivables",
]

# ---------------------------------------------------------------------------
# Per-field filter whitelist (4 — the async-select filters).
# Used by CreditReportOptionsQuery and CreditReportListQuery per-field filters.
# ---------------------------------------------------------------------------

CreditReportField = Literal[
    "customer_name",
    "city",
    "customer",
    "cca_description",
]

#: Plant-level grouping of credit control areas.
PlantFilter = Literal["jsw", "jvml", "all"]

# ---------------------------------------------------------------------------
# Query DTOs
# ---------------------------------------------------------------------------


class CreditReportListQuery(PageQuery):
    """Query params for GET /credit-report.

    Extends PageQuery (page, limit, sortOrder).  Sort keys are a Pydantic
    Literal whitelist so unknown values are rejected at parse time.

    Exactly 8 filters:
      - ``date``: single report date, ``"dd-mm-yyyy"`` — exact match on the
        stored ``report_date`` field (pattern-validated; no timezone math).
      - 4 per-field exact-match filters (one per CreditReportField, None = off).
      - ``blocked``: enum — "blocked" maps to DB value "X"; "unblocked" maps
        to None/"" (i.e. not "X").
      - ``credit_balance_sign``: enum — "positive" (>=0) / "negative" (<0).
      - ``plant``: enum — "jsw" maps to CCAs VJ0H + 1000; "jvml" maps to
        CCA JV0H; "all" applies no CCA filter.
      - ``region``: optional region _id; restricts rows whose ``customer``
        SAP code matches a CustomerCode assigned to that region.
    """

    sortBy: CreditReportSortBy = "created_at"

    # Single report-date filter — exact match on report_date ("dd-mm-yyyy").
    date: str | None = Field(default=None, pattern=r"^\d{2}-\d{2}-\d{4}$")

    # 4 per-field exact-match filters (one per CreditReportField, None = no filter).
    customer_name: str | None = Field(default=None, max_length=200)
    city: str | None = Field(default=None, max_length=200)
    customer: str | None = Field(default=None, max_length=200)
    cca_description: str | None = Field(default=None, max_length=200)

    # Blocked enum filter.
    blocked: Literal["blocked", "unblocked"] | None = None

    # Credit balance sign filter.
    credit_balance_sign: Literal["positive", "negative"] | None = None

    # Plant-level CCA grouping filter.
    plant: PlantFilter = "all"

    # Region filter — region _id hex; applied via CustomerCode join on `customer`.
    region: str | None = Field(default=None, max_length=200)


class CreditReportOptionsQuery(BaseModel):
    """Query params for GET /credit-report/options.

    Returns distinct values for a single whitelisted field, optionally
    filtered by a search string. Hard-capped at 50 (options lists only).
    """

    field: CreditReportField
    q: str | None = Field(default=None, max_length=200)
    limit: int = Field(default=20, ge=1, le=50)

"""JSW Stock request/response DTOs — list, options, and sort/filter literals.

Mirrors schemas/customer_code.py pattern.
AsyncOption imported exclusively from .admin_user (same rule as customer_code).

Filter surface (party-code filter added, 2026-06): exactly 6 filters —
a single ``date`` (exact match on report_date) plus five per-field async-select
filters (party_code, sales_order_type, customer_name, sales_office,
nco_declared). The former free-text ``q``, created_at date-range, and the
``customer`` column were removed.
"""
from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

from .common import PageQuery

# ---------------------------------------------------------------------------
# Sort key whitelist (Literal → unknown values rejected at parse time)
# SPEC §1 JswStockSortBy list, exact order; default: created_at
# ---------------------------------------------------------------------------

JswStockSortBy = Literal[
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

# ---------------------------------------------------------------------------
# Per-field filter whitelist (5 — the async-select filters).
# Used by JswStockOptionsQuery and JswStockListQuery per-field filters.
# `customer_name` is the mapped master name attached at ingest time;
# `party_code` is the raw zero-padded SAP party code (the customer join key).
# ---------------------------------------------------------------------------

JswStockField = Literal[
    "party_code",
    "sales_order_type",
    "customer_name",
    "sales_office",
    "nco_declared",
]

# ---------------------------------------------------------------------------
# Query DTOs
# ---------------------------------------------------------------------------


class JswStockListQuery(PageQuery):
    """Query params for GET /jsw-stock.

    Extends PageQuery (page, limit, sortOrder).  Sort keys are a Pydantic
    Literal whitelist so unknown values are rejected at parse time.

    Exactly 6 filters:
      - ``date``: single report date, ``"dd-mm-yyyy"`` — exact match on the
        stored ``report_date`` field (pattern-validated; no timezone math).
      - 5 per-field exact-match filters (one per JswStockField, None = off).
    """

    sortBy: JswStockSortBy = "created_at"

    # Single report-date filter — exact match on report_date ("dd-mm-yyyy").
    date: str | None = Field(default=None, pattern=r"^\d{2}-\d{2}-\d{4}$")

    # 5 per-field exact-match filters (one per JswStockField, None = no filter).
    party_code: str | None = Field(default=None, max_length=200)
    sales_order_type: str | None = Field(default=None, max_length=200)
    customer_name: str | None = Field(default=None, max_length=200)
    sales_office: str | None = Field(default=None, max_length=200)
    nco_declared: str | None = Field(default=None, max_length=200)


class JswStockOptionsQuery(BaseModel):
    """Query params for GET /jsw-stock/options.

    Returns distinct values for a single whitelisted field, optionally
    filtered by a search string. Hard-capped at 50 (options lists only).
    """

    field: JswStockField
    q: str | None = Field(default=None, max_length=200)
    limit: int = Field(default=20, ge=1, le=50)

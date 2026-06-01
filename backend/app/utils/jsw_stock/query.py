# app/utils/jsw_stock/query.py
"""Query helpers for the jsw_stock domain (filter + sort building).

Filter surface (JSW/JVML stock filter overhaul, 2026-06): exactly 5 filters —
a single ``date`` (exact match on the stored ``report_date`` string) plus four
per-field exact-match filters. No free-text ``q``, no created_at range, so no
``$regex`` (the previous ReDoS-guarded search was removed with the q field).
"""
from __future__ import annotations

from typing import Any

from ...schemas.jsw_stock import JswStockListQuery

# ---------------------------------------------------------------------------
# Field lists
# ---------------------------------------------------------------------------

# 5 fields exposed as per-field exact-match filter params (JswStockField order).
# `customer_name` is the mapped master name attached at ingest time;
# `party_code` is the raw zero-padded SAP party code (the customer join key).
_FILTER_FIELDS = (
    "party_code",
    "sales_order_type",
    "customer_name",
    "sales_office",
    "nco_declared",
)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def build_jsw_stock_filter(query: JswStockListQuery) -> dict[str, Any]:
    """Translate validated query params into a MongoDB filter document.

    - date: exact match on ``report_date`` ("dd-mm-yyyy"), single day.
    - 4 per-field filters: exact string match when non-None.
    """
    filt: dict[str, Any] = {}

    # -- single report-date filter (exact match on report_date) ----------------
    if query.date:
        filt["report_date"] = query.date

    # -- per-field exact-match filters -----------------------------------------
    for field in _FILTER_FIELDS:
        value = getattr(query, field, None)
        if value is not None:
            filt[field] = value

    return filt


def build_sort(sort_by: str, sort_order: str) -> str:
    """Build a Beanie sort token (``+field`` / ``-field``) from whitelisted input.

    ``sort_by`` is constrained to ``JswStockSortBy`` at the schema layer so only
    the whitelisted field names can ever reach here (``backend-api-standards``).
    ``sort_order`` is ``"asc"`` or ``"desc"``; anything else defaults to descending.
    """
    prefix = "+" if sort_order == "asc" else "-"
    return f"{prefix}{sort_by}"

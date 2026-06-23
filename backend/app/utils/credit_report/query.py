# app/utils/credit_report/query.py
"""Query helpers for the credit_report domain (filter + sort building).

Filter surface (per SPEC §4): exactly 7 filters — an optional ``date`` (exact
match on the stored ``report_date`` string), four per-field exact-match filters
(customer_name, city, customer, cca_description), one ``blocked`` enum
(blocked/unblocked), one ``credit_balance_sign`` enum (positive/negative), and
one ``plant`` enum (jsw/jvml/all) that groups credit control areas.
No free-text ``q``, no dateFrom/dateTo range.
"""
from __future__ import annotations

from typing import Any

from ...schemas.credit_report import CreditReportListQuery

# ---------------------------------------------------------------------------
# Field lists
# ---------------------------------------------------------------------------

# 4 fields exposed as per-field exact-match filter params.
_FILTER_FIELDS = ("customer_name", "city", "customer", "cca_description")

# Plant → credit-control-area mapping.  Stored as strings because the source
# Excel stores the column as text ("1000" is not ingested as a number).
_PLANT_CCA_MAP: dict[str, list[str]] = {
    "jsw": ["VJ0H", "1000"],
    "jvml": ["JV0H"],
}


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def build_credit_report_filter(query: CreditReportListQuery) -> dict[str, Any]:
    """Translate validated query params into a MongoDB filter document.

    - date: exact match on ``report_date`` ("dd-mm-yyyy"), single day.
    - 4 per-field filters: exact string match when non-None.
    - blocked: "blocked" → {"blocked": "X"}; "unblocked" → {"blocked": {"$in": [None, ""]}}
    - credit_balance_sign: "negative" → {"credit_balance": {"$lt": 0}};
      "positive" → {"credit_balance": {"$gte": 0}}
    """
    filt: dict[str, Any] = {}

    if query.date:
        filt["report_date"] = query.date

    for field in _FILTER_FIELDS:
        v = getattr(query, field, None)
        if v is not None:
            filt[field] = v

    if query.blocked == "blocked":
        filt["blocked"] = "X"
    elif query.blocked == "unblocked":
        filt["blocked"] = {"$in": [None, ""]}

    if query.credit_balance_sign == "negative":
        filt["credit_balance"] = {"$lt": 0}
    elif query.credit_balance_sign == "positive":
        filt["credit_balance"] = {"$gte": 0}

    if query.plant in _PLANT_CCA_MAP:
        filt["credit_control_area"] = {"$in": _PLANT_CCA_MAP[query.plant]}

    return filt


def build_sort(sort_by: str, sort_order: str) -> str:
    """Build a Beanie sort token (``+field`` / ``-field``) from whitelisted input.

    ``sort_by`` is constrained to ``CreditReportSortBy`` at the schema layer so
    only the whitelisted field names can ever reach here
    (``backend-api-standards``).
    ``sort_order`` is ``"asc"`` or ``"desc"``; anything else defaults to
    descending.
    """
    prefix = "+" if sort_order == "asc" else "-"
    return f"{prefix}{sort_by}"

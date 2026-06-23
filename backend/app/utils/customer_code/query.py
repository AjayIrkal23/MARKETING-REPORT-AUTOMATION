"""Query helpers for the customer_code domain (filter + sort building).

``build_customer_code_filter`` applies ``re.escape`` to all user-supplied string
inputs before any ``$regex`` construction (ReDoS guard, OWASP A05).
Free-text search (``q``) uses ``$or`` across all thirteen text fields:
``segment``, ``code``, ``customer``, ``destination``, ``cam``, ``mob``,
``head``, ``route``, ``ship_to``, ``ship_to_customer``,
``ship_to_city``, ``rake``, ``transport_mode``.
Per-field exact-match filters apply to nine fields:
``segment``, ``code``, ``customer``, ``destination``, ``cam``, ``mob``,
``ship_to_city``, ``rake``, ``transport_mode``.
The ``region`` query key maps to the ``region_id`` DB field (not a typo —
the FE sends ``region``; the BE stores ``region_id``).
``build_sort`` mirrors the pattern in ``utils/region/query.py``.
"""

from __future__ import annotations

import re
from typing import Any

from ...schemas.customer_code import CustomerCodeListQuery

# All text fields eligible for $or free-text search (q param).
_TEXT_FIELDS = (
    "segment",
    "code",
    "customer",
    "destination",
    "cam",
    "mob",
    "head",
    "route",
    "ship_to",
    "ship_to_customer",
    "ship_to_city",
    "rake",
    "transport_mode",
)

# Fields exposed as per-field exact-match filter params in CustomerCodeListQuery.
_FILTER_FIELDS = (
    "segment", "code", "customer", "destination",
    "cam", "mob",
    "ship_to_city", "rake", "transport_mode",
)


def escape_regex(s: str) -> str:
    """Escape ``s`` for safe use inside a MongoDB ``$regex`` value.

    Prevents ReDoS by neutralising all PCRE meta-characters before
    the string is embedded in a ``{"$regex": ..., "$options": "i"}``
    predicate.  Length is already capped to 200 chars by the schema.
    """
    return re.escape(s)


def build_customer_code_filter(query: CustomerCodeListQuery) -> dict[str, Any]:
    """Translate validated query params into a MongoDB filter document.

    Free-text search (``q``) runs a case-insensitive ``$regex`` across all
    fifteen text fields using ``$or``.  The user-supplied string is escaped
    with ``re.escape`` before insertion so no regex meta-characters can leak
    through — length is already capped to 200 chars on the schema.

    Per-field filters (``segment``, ``code``, ``customer``, ``destination``,
    ``cam``, ``mob``, ``ship_to_city``, ``rake``, ``transport_mode``) are
    inserted as exact-match predicates when non-``None``. Fields such as
    ``head``, ``route``, ``ship_to``, ``ship_to_customer`` remain searchable
    via ``q`` but are not exposed as per-field filter params.

    The ``region`` query key (sent by the FE) maps to the ``region_id`` DB
    field.  This asymmetry is intentional and matches the schema contract
    (``backend-api-standards`` §query-key-vs-db-field).
    """
    filt: dict[str, Any] = {}

    # -- free-text $or search --------------------------------------------------
    if query.q:
        rx = {"$regex": escape_regex(query.q), "$options": "i"}
        filt["$or"] = [{field: rx} for field in _TEXT_FIELDS]

    # -- per-field exact-match filters -----------------------------------------
    for field in _FILTER_FIELDS:
        value = getattr(query, field, None)
        if value is not None:
            filt[field] = value

    # -- region FK filter — query key is "region", DB field is "region_id" -----
    if query.region is not None:
        filt["region_id"] = query.region

    return filt


def build_sort(sort_by: str, sort_order: str) -> str:
    """Build a Beanie sort token (``+field`` / ``-field``) from whitelisted input.

    ``sort_by`` is constrained to ``CustomerCodeSortBy`` at the schema layer so
    only the nine whitelisted field names can ever reach here
    (``backend-api-standards``).
    """
    prefix = "+" if sort_order == "asc" else "-"
    return f"{prefix}{sort_by}"

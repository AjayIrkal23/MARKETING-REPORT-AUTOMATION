"""Query helpers for the region domain (filter + sort building).

``build_region_filter`` applies ``re.escape`` to all user-supplied string
inputs before any ``$regex`` construction (ReDoS guard, OWASP A05).
Free-text search (``q``) uses ``$or`` across ``name`` and ``emails``.
A ``$regex`` predicate against an array field in MongoDB matches any element —
no ``$elemMatch`` is needed.  ``active`` is an exact-match ``bool`` predicate
added only when the caller supplied an explicit value.
``build_sort`` mirrors the pattern in ``utils/audit_log/query.py``.
"""

from __future__ import annotations

import re
from typing import Any

from ...schemas.region import RegionListQuery


def build_region_filter(query: RegionListQuery) -> dict[str, Any]:
    """Translate validated query params into a MongoDB filter document.

    Free-text search (``q``) runs a case-insensitive ``$regex`` across
    ``name`` and ``emails`` using ``$or``.  The user-supplied string is
    escaped with ``re.escape`` before insertion so no regex meta-characters
    can leak through — length is already capped to 200 chars on the schema.

    ``active`` is inserted as an exact ``bool`` (not a string) so MongoDB
    matches the stored field type directly.
    """
    filt: dict[str, Any] = {}

    # -- free-text $or search --------------------------------------------------
    if query.q:
        rx = {"$regex": re.escape(query.q), "$options": "i"}
        filt["$or"] = [
            {"name": rx},
            {"emails": rx},   # $regex on array field matches any element
        ]

    # -- exact-match filter ----------------------------------------------------
    if query.active is not None:
        filt["active"] = query.active

    return filt


def build_sort(sort_by: str, sort_order: str) -> str:
    """Build a Beanie sort token (``+field`` / ``-field``) from whitelisted input.

    ``sort_by`` is constrained to ``RegionSortBy`` at the schema layer so only
    the four whitelisted field names can ever reach here
    (``backend-api-standards``).
    """
    prefix = "+" if sort_order == "asc" else "-"
    return f"{prefix}{sort_by}"

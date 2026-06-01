"""Query helpers for the coil price domain (filter + sort building).

``build_coil_price_filter`` adds an exact-match ``active`` predicate only when
the caller supplied an explicit value.  ``build_sort`` mirrors the pattern in
``utils/region/query.py`` — ``sort_by`` is constrained to ``CoilPriceSortBy``
at the schema layer so only whitelisted field names can reach here.
"""

from __future__ import annotations

from typing import Any

from ...schemas.coil_price import CoilPriceListQuery


def build_coil_price_filter(query: CoilPriceListQuery) -> dict[str, Any]:
    """Translate validated query params into a MongoDB filter document.

    ``active`` is inserted as an exact ``bool`` (not a string) so MongoDB
    matches the stored field type directly.
    """
    filt: dict[str, Any] = {}

    if query.active is not None:
        filt["active"] = query.active

    return filt


def build_sort(sort_by: str, sort_order: str) -> str:
    """Build a Beanie sort token (``+field`` / ``-field``) from whitelisted input.

    ``sort_by`` is constrained to ``CoilPriceSortBy`` at the schema layer so only
    the whitelisted field names can ever reach here (``backend-api-standards``).
    """
    prefix = "+" if sort_order == "asc" else "-"
    return f"{prefix}{sort_by}"

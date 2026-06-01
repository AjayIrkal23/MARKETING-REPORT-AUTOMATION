"""JSW Stock domain controllers (list + options, authenticated users only).

Thin controllers — they receive validated inputs via FastAPI Depends, reject
unknown query params via frozenset whitelists, call the service layer, and
wrap results in a success() envelope.  No business logic lives here.

Controller gating:
  - list_jsw_stock_controller:  get_current_user (any authenticated user)
  - field_options_controller:   get_current_user (any authenticated user)

Unknown-key rejection (backend-api-standards, OWASP A04):
  - list:    10 allowed keys (4 base + date + 5 per-field filters)
  - options: 3 allowed keys (field, q, limit)
"""

from __future__ import annotations

from fastapi import Depends, Request

from ..core.auth_deps import get_current_user
from ..core.errors import ValidationError
from ..core.responses import SuccessEnvelope, success
from ..schemas.admin_user import AsyncOption
from ..schemas.auth import AuthUser
from ..schemas.jsw_stock import JswStockListQuery, JswStockOptionsQuery
from ..schemas.jsw_stock_record import JswStockPublic
from ..services.jsw_stock.list import list_jsw_stock
from ..services.jsw_stock.options import search_field_options

# ---------------------------------------------------------------------------
# Whitelists for unknown-key rejection (backend-api-standards, OWASP A04).
# Any query param not in these sets → 400 immediately.
#
# List: 4 base keys + date + 5 per-field filter keys = 10 total
# Options: 3 keys (field, q, limit)
# ---------------------------------------------------------------------------

_ALLOWED_LIST_KEYS = frozenset({
    # Base pagination / sort + single report-date filter
    "page", "limit", "sortBy", "sortOrder", "date",
    # 5 per-field filter keys (JswStockField Literal)
    "party_code", "sales_order_type", "customer_name", "sales_office", "nco_declared",
})

_ALLOWED_OPTION_KEYS = frozenset({"field", "q", "limit"})


# ---------------------------------------------------------------------------
# Controllers
# ---------------------------------------------------------------------------


async def list_jsw_stock_controller(
    request: Request,
    query: JswStockListQuery = Depends(),
    _user: AuthUser = Depends(get_current_user),
) -> SuccessEnvelope[list[JswStockPublic]]:
    """``GET /jsw-stock`` — paginated, sorted, filtered JSW stock list.

    Available to all authenticated users (not admin-only).
    Unknown query parameters raise a 400 ValidationError immediately.
    Pagination metadata is embedded in the ``meta`` field of the envelope.
    """
    unknown = set(request.query_params.keys()) - _ALLOWED_LIST_KEYS
    if unknown:
        raise ValidationError(
            f"Unknown query parameter(s): {', '.join(sorted(unknown))}"
        )
    items, meta = await list_jsw_stock(query)
    return success(items, meta=meta)


async def field_options_controller(
    request: Request,
    query: JswStockOptionsQuery = Depends(),
    _user: AuthUser = Depends(get_current_user),
) -> SuccessEnvelope[list[AsyncOption]]:
    """``GET /jsw-stock/options`` — async-combobox field options (≤50).

    Returns distinct values for a single whitelisted field, optionally
    filtered by a query string.  Powers the per-field async-select filters
    in the JSW Stock list toolbar.
    """
    unknown = set(request.query_params.keys()) - _ALLOWED_OPTION_KEYS
    if unknown:
        raise ValidationError(
            f"Unknown query parameter(s): {', '.join(sorted(unknown))}"
        )
    options = await search_field_options(query)
    return success(options)

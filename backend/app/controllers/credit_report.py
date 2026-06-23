"""Credit Report domain controllers (list + options, authenticated users only).

Thin controllers — they receive validated inputs via FastAPI Depends, reject
unknown query params via frozenset whitelists, call the service layer, and
wrap results in a success() envelope.  No business logic lives here.

Controller gating:
  - list_credit_report_controller:  get_current_user (any authenticated user)
  - field_options_controller:       get_current_user (any authenticated user)

Unknown-key rejection (backend-api-standards, OWASP A04):
  - list:    11 allowed keys (4 base + date + 4 per-field filters + 2 sign/enum filters)
  - options: 3 allowed keys (field, q, limit)
"""

from __future__ import annotations

from io import BytesIO

from fastapi import Depends, Request
from starlette.responses import StreamingResponse

from ..core.auth_deps import get_current_user
from ..core.errors import ValidationError
from ..core.responses import SuccessEnvelope, success
from ..schemas.admin_user import AsyncOption
from ..schemas.auth import AuthUser
from ..schemas.credit_report import CreditReportListQuery, CreditReportOptionsQuery
from ..schemas.credit_report_record import CreditReportPublic
from ..services.credit_report.export import export_credit_report
from ..services.credit_report.list import list_credit_report
from ..services.credit_report.options import search_field_options

# ---------------------------------------------------------------------------
# Whitelists for unknown-key rejection (backend-api-standards, OWASP A04).
# Any query param not in these sets → 400 immediately.
#
# List: 4 base keys + date + 4 per-field filter keys + 3 enum filters = 12 total
# Options: 3 keys (field, q, limit)
# ---------------------------------------------------------------------------

_ALLOWED_LIST_KEYS = frozenset({
    # Base pagination / sort + single report-date filter
    "page", "limit", "sortBy", "sortOrder", "date",
    # 4 per-field async-select filter keys (CreditReportField Literal)
    "customer_name", "city", "customer", "cca_description",
    # 3 enum filters
    "blocked", "credit_balance_sign", "plant",
    # Region filter
    "region",
})

_ALLOWED_OPTION_KEYS = frozenset({"field", "q", "limit"})

_ALLOWED_EXPORT_KEYS = frozenset({
    "date",
    "customer_name", "city", "customer", "cca_description",
    "blocked", "credit_balance_sign", "plant",
    "region",
})


# ---------------------------------------------------------------------------
# Controllers
# ---------------------------------------------------------------------------


async def list_credit_report_controller(
    request: Request,
    query: CreditReportListQuery = Depends(),
    _user: AuthUser = Depends(get_current_user),
) -> SuccessEnvelope[list[CreditReportPublic]]:
    """``GET /credit-report`` — paginated, sorted, filtered credit report list.

    Available to all authenticated users (not admin-only).
    Unknown query parameters raise a 400 ValidationError immediately.
    Pagination metadata is embedded in the ``meta`` field of the envelope.
    """
    unknown = set(request.query_params.keys()) - _ALLOWED_LIST_KEYS
    if unknown:
        raise ValidationError(
            f"Unknown query parameter(s): {', '.join(sorted(unknown))}"
        )
    items, meta = await list_credit_report(query)
    return success(items, meta=meta)


async def field_options_controller(
    request: Request,
    query: CreditReportOptionsQuery = Depends(),
    _user: AuthUser = Depends(get_current_user),
) -> SuccessEnvelope[list[AsyncOption]]:
    """``GET /credit-report/options`` — async-combobox field options (≤50).

    Returns distinct values for a single whitelisted field, optionally
    filtered by a query string.  Powers the per-field async-select filters
    in the Credit Report list toolbar.
    """
    unknown = set(request.query_params.keys()) - _ALLOWED_OPTION_KEYS
    if unknown:
        raise ValidationError(
            f"Unknown query parameter(s): {', '.join(sorted(unknown))}"
        )
    options = await search_field_options(query)
    return success(options)


async def export_credit_report_controller(
    request: Request,
    query: CreditReportListQuery = Depends(),
    _user: AuthUser = Depends(get_current_user),
) -> StreamingResponse:
    """``GET /credit-report/export`` — export matching rows as .xlsx.

    Applies the same filters as the list endpoint but returns every matching
    row without pagination.
    """
    unknown = set(request.query_params.keys()) - _ALLOWED_EXPORT_KEYS
    if unknown:
        raise ValidationError(
            f"Unknown query parameter(s): {', '.join(sorted(unknown))}"
        )

    data: bytes = await export_credit_report(query)
    filename = f"credit_report_{query.date or 'all'}.xlsx"
    return StreamingResponse(
        BytesIO(data),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )

"""Analytics dashboard controllers.

Thin controllers that validate query params, reject unknown keys, and delegate
to the analytics service layer.
"""

from __future__ import annotations

from fastapi import Depends, Request

from ..core.auth_deps import get_current_user
from ..core.errors import ValidationError
from ..core.responses import SuccessEnvelope, success
from ..schemas.admin_user import AsyncOption
from ..schemas.analytics import AnalyticsDashboardData, AnalyticsOptionsQuery, AnalyticsQuery
from ..schemas.auth import AuthUser
from ..services.analytics.dashboard import get_analytics_dashboard
from ..services.analytics.options import search_analytics_options

_ALLOWED_DASHBOARD_KEYS = frozenset({
    "reportType", "fromDate", "toDate", "region", "days",
    "distr_chnl", "sales_office", "customer_name",
    "segment", "transport_mode", "rake", "route",
})

_ALLOWED_OPTIONS_KEYS = frozenset({
    "field", "q", "limit", "reportType", "fromDate", "toDate", "region",
})


async def analytics_dashboard_controller(
    request: Request,
    query: AnalyticsQuery = Depends(),
    _user: AuthUser = Depends(get_current_user),
) -> SuccessEnvelope[AnalyticsDashboardData]:
    """``GET /analytics/stock-dashboard`` — total-only stock analytics."""
    unknown = set(request.query_params.keys()) - _ALLOWED_DASHBOARD_KEYS
    if unknown:
        raise ValidationError(
            f"Unknown query parameter(s): {', '.join(sorted(unknown))}"
        )
    data = await get_analytics_dashboard(query)
    return success(data)


async def analytics_options_controller(
    request: Request,
    query: AnalyticsOptionsQuery = Depends(),
    _user: AuthUser = Depends(get_current_user),
) -> SuccessEnvelope[list[AsyncOption]]:
    """``GET /analytics/options`` — dimension values for multi-select filters."""
    unknown = set(request.query_params.keys()) - _ALLOWED_OPTIONS_KEYS
    if unknown:
        raise ValidationError(
            f"Unknown query parameter(s): {', '.join(sorted(unknown))}"
        )
    options = await search_analytics_options(query)
    return success(options)

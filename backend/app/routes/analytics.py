"""Analytics dashboard routes.

Public (authenticated) endpoints for the dashboard analytics section.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends

from ..controllers import analytics as ctrl
from ..core.auth_deps import get_current_user
from ..core.responses import SuccessEnvelope
from ..schemas.admin_user import AsyncOption
from ..schemas.analytics import AnalyticsDashboardData

router = APIRouter(
    prefix="/analytics",
    tags=["analytics"],
    dependencies=[Depends(get_current_user)],
)

router.add_api_route(
    "/stock-dashboard",
    ctrl.analytics_dashboard_controller,
    methods=["GET"],
    response_model=SuccessEnvelope[AnalyticsDashboardData],
    summary="Stock analytics dashboard (totals by RAKE, transport, channel, segment, customer)",
)

router.add_api_route(
    "/options",
    ctrl.analytics_options_controller,
    methods=["GET"],
    response_model=SuccessEnvelope[list[AsyncOption]],
    summary="Async options for analytics multi-select filters",
)

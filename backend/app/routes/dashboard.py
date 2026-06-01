"""Dashboard routes — non-admin landing-page summary.

router: prefix /dashboard — authenticated users (get_current_user)

A single read endpoint backing the dashboard status cards. No admin/config
router (unlike the stock/credit domains) — the dashboard only reads existing
ingestion state, it never schedules or mutates anything.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends

from ..controllers import dashboard as ctrl
from ..core.auth_deps import get_current_user
from ..core.responses import SuccessEnvelope
from ..schemas.dashboard import DashboardSummary

router = APIRouter(
    prefix="/dashboard",
    tags=["dashboard"],
    dependencies=[Depends(get_current_user)],
)

# GET /summary — today's per-report ingestion status (dashboard cards)
router.add_api_route(
    "/summary",
    ctrl.dashboard_summary_controller,
    methods=["GET"],
    response_model=SuccessEnvelope[DashboardSummary],
    summary="Today's per-report ingestion status for the dashboard cards",
)

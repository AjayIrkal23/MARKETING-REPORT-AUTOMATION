"""Dashboard domain controller (today's per-report ingestion status).

Thin controller — no query params (the date is always "today", local clock),
so there is no unknown-key rejection to perform. Available to all authenticated
users (the dashboard landing page is non-admin, like the stock-list screens).
"""

from __future__ import annotations

from fastapi import Depends

from ..core.auth_deps import get_current_user
from ..core.responses import SuccessEnvelope, success
from ..schemas.auth import AuthUser
from ..schemas.dashboard import DashboardSummary
from ..services.dashboard.summary import get_dashboard_summary


async def dashboard_summary_controller(
    _user: AuthUser = Depends(get_current_user),
) -> SuccessEnvelope[DashboardSummary]:
    """``GET /dashboard/summary`` — today's ingestion status for the 3 reports.

    Available to all authenticated users (not admin-only). Returns one status
    entry per scheduled-ingestion domain for the current local date.
    """
    summary = await get_dashboard_summary()
    return success(summary)

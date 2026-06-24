"""Credit Report routes — two routers in one module.

router        prefix=/credit-report         gate=get_current_user  (all auth users)
config_router prefix=/admin/credit-report   gate=get_current_admin (admin only)

Registration order rule (mirror jvml_stock.py):
  /options MUST be registered before any /{id} path param route (none here,
  but keep literal routes first as a guard for future additions).

Both routers are exported. The ORCHESTRATOR includes both in routes/__init__.py.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends

from ..controllers import credit_report as ctrl
from ..controllers import credit_report_config as cfg_ctrl
from ..core.auth_deps import get_current_admin, get_current_user
from ..core.responses import SuccessEnvelope
from ..schemas.admin_user import AsyncOption
from ..schemas.cleanup import CleanupDuplicatesResponse
from ..schemas.credit_report_config import (
    CreditReportConfigPublic,
    CreditReportStatusPublic,
)
from ..schemas.credit_report_record import CreditReportPublic

# ---------------------------------------------------------------------------
# Public (authenticated) router
# ---------------------------------------------------------------------------

router = APIRouter(
    prefix="/credit-report",
    tags=["credit-report"],
    dependencies=[Depends(get_current_user)],
)

# /export — download matching rows as .xlsx
router.add_api_route(
    "/export",
    ctrl.export_credit_report_controller,
    methods=["GET"],
    summary="Export credit report as .xlsx",
)

# /options MUST come before any /{id} route (registration-order guard).
router.add_api_route(
    "",
    ctrl.list_credit_report_controller,
    methods=["GET"],
    response_model=SuccessEnvelope[list[CreditReportPublic]],
    summary="List credit report (paginated)",
)

router.add_api_route(
    "/options",
    ctrl.field_options_controller,
    methods=["GET"],
    response_model=SuccessEnvelope[list[AsyncOption]],
    summary="Async combobox field options",
)

# ---------------------------------------------------------------------------
# Admin config router
# ---------------------------------------------------------------------------

config_router = APIRouter(
    prefix="/admin/credit-report",
    tags=["credit-report-admin"],
    dependencies=[Depends(get_current_admin)],
)

config_router.add_api_route(
    "/config",
    cfg_ctrl.get_config_controller,
    methods=["GET"],
    response_model=SuccessEnvelope[CreditReportConfigPublic],
    summary="Get credit report config",
)

config_router.add_api_route(
    "/config",
    cfg_ctrl.update_config_controller,
    methods=["PUT"],
    response_model=SuccessEnvelope[CreditReportConfigPublic],
    summary="Update credit report config",
)

config_router.add_api_route(
    "/status",
    cfg_ctrl.get_status_controller,
    methods=["GET"],
    response_model=SuccessEnvelope[CreditReportStatusPublic],
    summary="Get credit report ingestion status",
)

config_router.add_api_route(
    "/run-now",
    cfg_ctrl.run_now_controller,
    methods=["POST"],
    response_model=SuccessEnvelope[CreditReportStatusPublic],
    summary="Trigger credit report poll immediately",
)

config_router.add_api_route(
    "/run-now/{region_id}",
    cfg_ctrl.run_now_zone_controller,
    methods=["POST"],
    response_model=SuccessEnvelope[CreditReportStatusPublic],
    summary="Trigger credit report poll for one region zone",
)

config_router.add_api_route(
    "/cleanup-duplicates",
    cfg_ctrl.cleanup_duplicates_controller,
    methods=["POST"],
    response_model=SuccessEnvelope[CleanupDuplicatesResponse],
    summary="Delete older duplicate credit report rows for a report date",
)

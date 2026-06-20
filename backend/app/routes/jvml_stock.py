"""JVML Stock routes — two routers in one module.

router        prefix=/jvml-stock         gate=get_current_user  (all auth users)
config_router prefix=/admin/jvml-stock   gate=get_current_admin (admin only)

Registration order rule (mirror customer_code.py):
  /options MUST be registered before any /{id} path param route (none here,
  but keep literal routes first as a guard for future additions).

Both routers are exported. The ORCHESTRATOR includes both in routes/__init__.py.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends

from ..controllers import jvml_stock as ctrl
from ..controllers import jvml_stock_config as cfg_ctrl
from ..core.auth_deps import get_current_admin, get_current_user
from ..core.responses import SuccessEnvelope
from ..schemas.admin_user import AsyncOption
from ..schemas.cleanup import CleanupDuplicatesResponse
from ..schemas.jvml_stock_config import (
    JvmlStockConfigPublic,
    JvmlStockStatusPublic,
)
from ..schemas.jvml_stock_record import JvmlStockPublic

# ---------------------------------------------------------------------------
# Public (authenticated) router
# ---------------------------------------------------------------------------

router = APIRouter(
    prefix="/jvml-stock",
    tags=["jvml-stock"],
    dependencies=[Depends(get_current_user)],
)

# /options MUST come before any /{id} route (registration-order guard).
router.add_api_route(
    "",
    ctrl.list_jvml_stock_controller,
    methods=["GET"],
    response_model=SuccessEnvelope[list[JvmlStockPublic]],
    summary="List JVML stock (paginated)",
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
    prefix="/admin/jvml-stock",
    tags=["jvml-stock-admin"],
    dependencies=[Depends(get_current_admin)],
)

config_router.add_api_route(
    "/config",
    cfg_ctrl.get_config_controller,
    methods=["GET"],
    response_model=SuccessEnvelope[JvmlStockConfigPublic],
    summary="Get JVML stock config",
)

config_router.add_api_route(
    "/config",
    cfg_ctrl.update_config_controller,
    methods=["PUT"],
    response_model=SuccessEnvelope[JvmlStockConfigPublic],
    summary="Update JVML stock config",
)

config_router.add_api_route(
    "/status",
    cfg_ctrl.get_status_controller,
    methods=["GET"],
    response_model=SuccessEnvelope[JvmlStockStatusPublic],
    summary="Get JVML stock ingestion status",
)

config_router.add_api_route(
    "/run-now",
    cfg_ctrl.run_now_controller,
    methods=["POST"],
    response_model=SuccessEnvelope[JvmlStockStatusPublic],
    summary="Trigger JVML stock poll immediately",
)

config_router.add_api_route(
    "/cleanup-duplicates",
    cfg_ctrl.cleanup_duplicates_controller,
    methods=["POST"],
    response_model=SuccessEnvelope[CleanupDuplicatesResponse],
    summary="Delete older duplicate JVML stock rows for a report date",
)

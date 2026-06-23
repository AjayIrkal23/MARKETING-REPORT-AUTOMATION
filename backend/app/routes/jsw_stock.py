"""JSW Stock routes — TWO routers exported from this module.

router:        prefix /jsw-stock        — authenticated users (get_current_user)
config_router: prefix /admin/jsw-stock  — admin only (get_current_admin)

Registration order: /options registered before any variable segment (none here,
but the convention is followed). Config literals (/config, /status, /run-now)
are all literal strings — no collision risk.

Contract: .planning/jsw-stock/SPEC.md §2 + ADDENDUM.md (ADDENDUM wins on conflict).
"""

from __future__ import annotations

from fastapi import APIRouter, Depends

from ..controllers import jsw_stock as ctrl
from ..controllers import jsw_stock_config as cfg_ctrl
from ..core.auth_deps import get_current_admin, get_current_user
from ..core.responses import SuccessEnvelope
from ..schemas.admin_user import AsyncOption
from ..schemas.cleanup import CleanupDuplicatesResponse
from ..schemas.jsw_stock_config import JswStockConfigPublic, JswStockStatusPublic
from ..schemas.jsw_stock_record import JswStockPublic

# ---------------------------------------------------------------------------
# Public (authenticated) router — prefix /jsw-stock
# ---------------------------------------------------------------------------

router = APIRouter(
    prefix="/jsw-stock",
    tags=["jsw-stock"],
    dependencies=[Depends(get_current_user)],
)

# GET ""  — list rows (paginated, sorted, filtered)
router.add_api_route(
    "",
    ctrl.list_jsw_stock_controller,
    methods=["GET"],
    response_model=SuccessEnvelope[list[JswStockPublic]],
    summary="List JSW stock rows (paginated)",
)

# GET /export — download matching rows as .xlsx
router.add_api_route(
    "/export",
    ctrl.export_jsw_stock_controller,
    methods=["GET"],
    summary="Export JSW stock as .xlsx",
)

# GET /options — async-combobox field options
# Registered BEFORE any variable-segment route (none here, but convention kept).
router.add_api_route(
    "/options",
    ctrl.field_options_controller,
    methods=["GET"],
    response_model=SuccessEnvelope[list[AsyncOption]],
    summary="Async combobox field options for JSW stock filters",
)

# ---------------------------------------------------------------------------
# Admin config router — prefix /admin/jsw-stock
# ---------------------------------------------------------------------------

config_router = APIRouter(
    prefix="/admin/jsw-stock",
    tags=["admin-jsw-stock"],
    dependencies=[Depends(get_current_admin)],
)

# GET /config — retrieve current singleton config
config_router.add_api_route(
    "/config",
    cfg_ctrl.get_config_controller,
    methods=["GET"],
    response_model=SuccessEnvelope[JswStockConfigPublic],
    summary="Get JSW stock Excel config",
)

# PUT /config — update config and reschedule the poll job
config_router.add_api_route(
    "/config",
    cfg_ctrl.update_config_controller,
    methods=["PUT"],
    response_model=SuccessEnvelope[JswStockConfigPublic],
    summary="Update JSW stock Excel config",
)

# GET /status — ingestion status + recent runs
config_router.add_api_route(
    "/status",
    cfg_ctrl.get_status_controller,
    methods=["GET"],
    response_model=SuccessEnvelope[JswStockStatusPublic],
    summary="Get JSW stock ingestion status",
)

# POST /run-now — trigger an immediate poll (admin-only)
config_router.add_api_route(
    "/run-now",
    cfg_ctrl.run_now_controller,
    methods=["POST"],
    response_model=SuccessEnvelope[JswStockStatusPublic],
    summary="Trigger an immediate JSW stock poll",
)

# POST /cleanup-duplicates — remove older duplicate rows for a report date
config_router.add_api_route(
    "/cleanup-duplicates",
    cfg_ctrl.cleanup_duplicates_controller,
    methods=["POST"],
    response_model=SuccessEnvelope[CleanupDuplicatesResponse],
    summary="Delete older duplicate JSW stock rows for a report date",
)

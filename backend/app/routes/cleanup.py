"""Cleanup routes — admin-only config + run-now for the stale-folder cleanup job.

config_router prefix=/admin/cleanup   gate=get_current_admin (admin only)

Exported as ``config_router`` and included by routes/__init__.py (mirrors the
credit_report config_router naming).
"""

from __future__ import annotations

from fastapi import APIRouter, Depends

from ..controllers import cleanup_config as cfg_ctrl
from ..core.auth_deps import get_current_admin
from ..core.responses import SuccessEnvelope
from ..schemas.cleanup_config import CleanupConfigPublic

config_router = APIRouter(
    prefix="/admin/cleanup",
    tags=["cleanup-admin"],
    dependencies=[Depends(get_current_admin)],
)

config_router.add_api_route(
    "/config",
    cfg_ctrl.get_config_controller,
    methods=["GET"],
    response_model=SuccessEnvelope[CleanupConfigPublic],
    summary="Get ingestion folder cleanup config",
)

config_router.add_api_route(
    "/config",
    cfg_ctrl.update_config_controller,
    methods=["PUT"],
    response_model=SuccessEnvelope[CleanupConfigPublic],
    summary="Update ingestion folder cleanup config",
)

config_router.add_api_route(
    "/run-now",
    cfg_ctrl.run_now_controller,
    methods=["POST"],
    response_model=SuccessEnvelope[CleanupConfigPublic],
    summary="Trigger ingestion folder cleanup immediately",
)

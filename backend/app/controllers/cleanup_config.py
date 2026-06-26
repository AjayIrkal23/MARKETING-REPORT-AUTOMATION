"""Cleanup config controllers (admin-only: config get/put + run-now).

Thin controllers — validated inputs via FastAPI Depends, call the service
layer, wrap results in a success() envelope. All endpoints gated by
get_current_admin. Mirrors controllers/credit_report_config.py layering.

  - get_config_controller:    GET  /admin/cleanup/config
  - update_config_controller: PUT  /admin/cleanup/config
  - run_now_controller:       POST /admin/cleanup/run-now
"""

from __future__ import annotations

from fastapi import Depends

from ..core.auth_deps import get_current_admin
from ..core.responses import SuccessEnvelope, success
from ..schemas.auth import AuthUser
from ..schemas.cleanup_config import CleanupConfigPublic, CleanupConfigUpdate
from ..services.cleanup.config_service import get_config, upsert_config


async def get_config_controller(
    _admin: AuthUser = Depends(get_current_admin),
) -> SuccessEnvelope[CleanupConfigPublic]:
    """``GET /admin/cleanup/config`` — current cleanup policy singleton."""
    return success(await get_config())


async def update_config_controller(
    body: CleanupConfigUpdate,
    _admin: AuthUser = Depends(get_current_admin),
) -> SuccessEnvelope[CleanupConfigPublic]:
    """``PUT /admin/cleanup/config`` — replace the policy and reschedule the job.

    The mutation is auto-audited by AuditMiddleware (category ``admin``).
    """
    return success(await upsert_config(body), message="Configuration saved")


async def run_now_controller(
    _admin: AuthUser = Depends(get_current_admin),
) -> SuccessEnvelope[CleanupConfigPublic]:
    """``POST /admin/cleanup/run-now`` — run the cleanup immediately.

    Respects the ``enabled`` flag (a disabled policy is a no-op), mirroring the
    stock pollers' run-now. Returns the refreshed config incl. last-run info.
    """
    from ..services.cleanup.runner import run_cleanup  # noqa: PLC0415

    return success(await run_cleanup(), message="Cleanup triggered")

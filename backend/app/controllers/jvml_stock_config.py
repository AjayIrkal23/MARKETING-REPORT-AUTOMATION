"""JVML Stock config controllers (admin-only: config get/put, status, run-now).

Thin controllers — they receive validated inputs via FastAPI Depends, call the
service layer, and wrap results in a success() envelope.  All DB access and
business logic lives in the service layer.

All four endpoints are gated by get_current_admin (admin users only).

  - get_config_controller:     GET  /admin/jvml-stock/config
  - update_config_controller:  PUT  /admin/jvml-stock/config
  - get_status_controller:     GET  /admin/jvml-stock/status
  - run_now_controller:        POST /admin/jvml-stock/run-now

Contract: SPEC.md §2 controllers + notes/be-controller-routes.md §2.2.
Mirrors controllers/customer_code.py layering and envelope pattern.
"""

from __future__ import annotations

from fastapi import Depends

from ..core.auth_deps import get_current_admin
from ..core.responses import SuccessEnvelope, success
from ..schemas.auth import AuthUser
from ..schemas.jvml_stock_config import (
    JvmlStockConfigPublic,
    JvmlStockConfigUpdate,
    JvmlStockStatusPublic,
)
from ..services.jvml_stock.config_service import get_config, upsert_config
from ..services.jvml_stock.status import get_status

# ---------------------------------------------------------------------------
# Controllers
# ---------------------------------------------------------------------------


async def get_config_controller(
    _admin: AuthUser = Depends(get_current_admin),
) -> SuccessEnvelope[JvmlStockConfigPublic]:
    """``GET /admin/jvml-stock/config`` — retrieve the current config singleton.

    Returns schema defaults (enabled=False, empty paths, interval=1h) if the
    config has never been explicitly saved via a PUT request.
    """
    return success(await get_config())


async def update_config_controller(
    body: JvmlStockConfigUpdate,
    admin: AuthUser = Depends(get_current_admin),
) -> SuccessEnvelope[JvmlStockConfigPublic]:
    """``PUT /admin/jvml-stock/config`` — replace the config and reschedule the job.

    Full-replacement PUT semantics: all fields must be present in the body.
    After saving, the APScheduler job is added/replaced (if enabled) or removed
    (if disabled).  Emits ``jvml_stock.config_updated`` audit event.
    """
    result = await upsert_config(body, actor_email=admin.emailid)
    return success(result, message="Configuration saved")


async def get_status_controller(
    _admin: AuthUser = Depends(get_current_admin),
) -> SuccessEnvelope[JvmlStockStatusPublic]:
    """``GET /admin/jvml-stock/status`` — ingestion status and recent run history.

    Returns the latest ingestion attempt summary plus the most-recent 14
    ingestion records.  Combines the config enabled flag with ingestion outcomes.
    """
    return success(await get_status())


async def run_now_controller(
    _admin: AuthUser = Depends(get_current_admin),
) -> SuccessEnvelope[JvmlStockStatusPublic]:
    """``POST /admin/jvml-stock/run-now`` — trigger an immediate stock file poll.

    Invokes the poller inline (not via the scheduler) so the admin can test
    that the config is correct without waiting for the next scheduled interval.
    Returns the updated status after the poll completes (or fails).
    """
    from ..services.jvml_stock.poller import run_poll  # noqa: PLC0415 — avoid cycle if poller imports scheduler

    await run_poll()
    return success(await get_status(), message="Poll triggered")

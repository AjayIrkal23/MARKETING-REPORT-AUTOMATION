"""Credit Report config controllers (admin-only: config get/put, status, run-now).

Thin controllers — they receive validated inputs via FastAPI Depends, call the
service layer, and wrap results in a success() envelope.  All DB access and
business logic lives in the service layer.

All four endpoints are gated by get_current_admin (admin users only).

  - get_config_controller:     GET  /admin/credit-report/config
  - update_config_controller:  PUT  /admin/credit-report/config
  - get_status_controller:     GET  /admin/credit-report/status
  - run_now_controller:        POST /admin/credit-report/run-now

Contract: SPEC.md §10 controllers.
Mirrors controllers/jvml_stock_config.py layering and envelope pattern.
"""

from __future__ import annotations

from fastapi import Depends

from ..core.auth_deps import get_current_admin
from ..core.responses import SuccessEnvelope, success
from ..schemas.auth import AuthUser
from ..schemas.credit_report_config import (
    CreditReportConfigPublic,
    CreditReportConfigUpdate,
    CreditReportStatusPublic,
)
from ..services.credit_report.config_service import get_config, upsert_config
from ..services.credit_report.status import get_status

# ---------------------------------------------------------------------------
# Controllers
# ---------------------------------------------------------------------------


async def get_config_controller(
    _admin: AuthUser = Depends(get_current_admin),
) -> SuccessEnvelope[CreditReportConfigPublic]:
    """``GET /admin/credit-report/config`` — retrieve the current config singleton.

    Returns schema defaults (enabled=False, empty paths, interval=1h) if the
    config has never been explicitly saved via a PUT request.
    """
    return success(await get_config())


async def update_config_controller(
    body: CreditReportConfigUpdate,
    admin: AuthUser = Depends(get_current_admin),
) -> SuccessEnvelope[CreditReportConfigPublic]:
    """``PUT /admin/credit-report/config`` — replace the config and reschedule the job.

    Full-replacement PUT semantics: all fields must be present in the body.
    After saving, the APScheduler job is added/replaced (if enabled) or removed
    (if disabled).  Emits ``credit_report.config_updated`` audit event.
    """
    result = await upsert_config(body, actor_email=admin.emailid)
    return success(result, message="Configuration saved")


async def get_status_controller(
    _admin: AuthUser = Depends(get_current_admin),
) -> SuccessEnvelope[CreditReportStatusPublic]:
    """``GET /admin/credit-report/status`` — ingestion status and recent run history.

    Returns the latest ingestion attempt summary plus the most-recent 14
    ingestion records.  Combines the config enabled flag with ingestion outcomes.
    """
    return success(await get_status())


async def run_now_controller(
    _admin: AuthUser = Depends(get_current_admin),
) -> SuccessEnvelope[CreditReportStatusPublic]:
    """``POST /admin/credit-report/run-now`` — trigger an immediate credit report file poll.

    Invokes the poller inline (not via the scheduler) so the admin can test
    that the config is correct without waiting for the next scheduled interval.
    Returns the updated status after the poll completes (or fails).
    """
    from ..services.credit_report.poller import run_poll  # noqa: PLC0415 — avoid cycle if poller imports scheduler

    await run_poll()
    return success(await get_status(), message="Poll triggered")

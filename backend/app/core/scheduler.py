"""AsyncIOScheduler lifecycle management.

Wraps APScheduler's ``AsyncIOScheduler`` with a safe start/shutdown interface.
APScheduler import or start failures are non-fatal — the app continues to boot
without cron support and a WARNING is logged.

Registered jobs
---------------
- ``heartbeat_job``  Interval: ``settings.audit_heartbeat_minutes`` minutes.
  Proves the scheduler is alive; counts ``audit_logs`` docs and emits a
  ``cron.heartbeat`` audit entry.

Contract: SPEC A6 of .planning/audit/SPEC.md.
"""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from apscheduler.schedulers.asyncio import AsyncIOScheduler

logger = logging.getLogger(__name__)

# Module-level singleton — None when the scheduler has not been started or
# when APScheduler is unavailable.
_scheduler: AsyncIOScheduler | None = None  # type: ignore[assignment]


def get_scheduler() -> AsyncIOScheduler | None:  # type: ignore[return]
    """Return the running scheduler instance, or ``None`` if not started."""
    return _scheduler


async def start_scheduler() -> None:
    """Build the scheduler, register all cron jobs, and start it.

    Tolerates import errors (APScheduler not installed) and runtime errors
    (e.g. already-running event loop edge cases) — both are logged at WARNING
    level and the function returns without raising so the app continues to boot.
    """
    global _scheduler  # noqa: PLW0603

    try:
        from apscheduler.schedulers.asyncio import AsyncIOScheduler  # noqa: PLC0415
        from apscheduler.triggers.interval import IntervalTrigger  # noqa: PLC0415
    except ImportError:
        logger.warning(
            "APScheduler not installed — cron jobs disabled. "
            "Run: pip install 'APScheduler>=3.11,<4'"
        )
        return

    try:
        from ..core.config import get_settings  # noqa: PLC0415
        from ..services.cron import heartbeat_job  # noqa: PLC0415

        settings = get_settings()

        sched = AsyncIOScheduler(timezone="UTC")
        sched.add_job(
            heartbeat_job,
            trigger=IntervalTrigger(minutes=settings.audit_heartbeat_minutes),
            id="audit.heartbeat",
            name="Audit heartbeat",
            replace_existing=True,
            misfire_grace_time=60,
        )

        sched.start()
        _scheduler = sched
        logger.info(
            "Scheduler started — heartbeat every %d minute(s).",
            settings.audit_heartbeat_minutes,
        )
    except Exception:  # noqa: BLE001
        logger.warning("Scheduler failed to start; cron jobs disabled.", exc_info=True)


async def shutdown_scheduler() -> None:
    """Shut the scheduler down gracefully, if it is running.

    Uses ``wait=False`` so the application shutdown is not delayed by
    in-progress job execution. Non-fatal — errors are logged at WARNING level.
    """
    global _scheduler  # noqa: PLW0603

    if _scheduler is None:
        return

    try:
        if _scheduler.running:
            _scheduler.shutdown(wait=False)
            logger.info("Scheduler shut down.")
    except Exception:  # noqa: BLE001
        logger.warning("Scheduler shutdown encountered an error.", exc_info=True)
    finally:
        _scheduler = None

"""AsyncIOScheduler lifecycle management.

Wraps APScheduler's ``AsyncIOScheduler`` with a safe start/shutdown interface.
APScheduler import or start failures are non-fatal — the app continues to boot
without cron support and a WARNING is logged.

Registered jobs
---------------
- ``audit.heartbeat``  Interval: ``settings.audit_heartbeat_minutes`` minutes.
  Proves the scheduler is alive; counts ``audit_logs`` docs and emits a
  ``cron.heartbeat`` audit entry.
- ``jsw_stock.poll`` / ``jvml_stock.poll``  Interval: ``interval_hours``. Ingests
  the daily Excel as soon as it lands inside the window.
- ``jsw_stock.deadline`` / ``jvml_stock.deadline``  Daily cron at ``end_time``
  (LOCAL tz). Guarantees the missing-file alert fires once per day even when no
  interval tick lands in ``[end_time, midnight]``. See ``scheduler_stock``.

Contract: SPEC A6 of .planning/audit/SPEC.md.
"""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING

from .scheduler_stock import (
    remove_stock_jobs,
    schedule_cleanup_job,
    schedule_stock_jobs,
)

if TYPE_CHECKING:
    from apscheduler.schedulers.asyncio import AsyncIOScheduler

logger = logging.getLogger(__name__)

# Module-level singleton — None when the scheduler has not been started or
# when APScheduler is unavailable.
_scheduler: AsyncIOScheduler | None = None  # type: ignore[assignment]

# Stable ids for the JSW Stock jobs — referenced everywhere to avoid drift.
JSW_STOCK_JOB_ID = "jsw_stock.poll"
JSW_STOCK_DEADLINE_JOB_ID = "jsw_stock.deadline"

# Stable ids for the JVML Stock jobs.
JVML_STOCK_JOB_ID = "jvml_stock.poll"
JVML_STOCK_DEADLINE_JOB_ID = "jvml_stock.deadline"

# Stable ids for the Credit Report jobs.
CREDIT_REPORT_JOB_ID = "credit_report.poll"
CREDIT_REPORT_DEADLINE_JOB_ID = "credit_report.deadline"

# Stable id for the daily stale-folder cleanup job.
CLEANUP_JOB_ID = "cleanup.daily"


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

        # Boot-register the JSW Stock poll + deadline jobs if enabled in the DB.
        # Local imports avoid the scheduler <-> cron <-> service circular chain.
        try:
            from ..models.jsw_stock_config import JswStockConfig  # noqa: PLC0415
            from ..services.cron.jsw_stock import jsw_stock_poll_job  # noqa: PLC0415

            jsw_cfg = await JswStockConfig.find_one({"key": "default"})
            if jsw_cfg is not None and jsw_cfg.enabled:
                schedule_stock_jobs(
                    sched,
                    jsw_stock_poll_job,
                    poll_id=JSW_STOCK_JOB_ID,
                    deadline_id=JSW_STOCK_DEADLINE_JOB_ID,
                    name="JSW Stock Excel poll",
                    interval_hours=jsw_cfg.interval_hours,
                    end_time=jsw_cfg.end_time,
                    immediate=False,
                )
                logger.info(
                    "JSW Stock jobs registered at startup: every %dh, deadline %s.",
                    jsw_cfg.interval_hours,
                    jsw_cfg.end_time,
                )
        except Exception:  # noqa: BLE001
            logger.warning("JSW Stock job boot-registration skipped.", exc_info=True)

        # Boot-register the JVML Stock poll + deadline jobs if enabled in the DB.
        try:
            from ..models.jvml_stock_config import JvmlStockConfig  # noqa: PLC0415
            from ..services.cron.jvml_stock import jvml_stock_poll_job  # noqa: PLC0415

            jvml_cfg = await JvmlStockConfig.find_one({"key": "default"})
            if jvml_cfg is not None and jvml_cfg.enabled:
                schedule_stock_jobs(
                    sched,
                    jvml_stock_poll_job,
                    poll_id=JVML_STOCK_JOB_ID,
                    deadline_id=JVML_STOCK_DEADLINE_JOB_ID,
                    name="JVML Stock Excel poll",
                    interval_hours=jvml_cfg.interval_hours,
                    end_time=jvml_cfg.end_time,
                    immediate=False,
                )
                logger.info(
                    "JVML Stock jobs registered at startup: every %dh, deadline %s.",
                    jvml_cfg.interval_hours,
                    jvml_cfg.end_time,
                )
        except Exception:  # noqa: BLE001
            logger.warning("JVML Stock job boot-registration skipped.", exc_info=True)

        # Boot-register the Credit Report poll + deadline jobs if enabled in the DB.
        try:
            from ..models.credit_report_config import CreditReportConfig  # noqa: PLC0415
            from ..services.cron.credit_report import credit_report_poll_job  # noqa: PLC0415

            cr_cfg = await CreditReportConfig.find_one({"key": "default"})
            if cr_cfg is not None and cr_cfg.enabled:
                schedule_stock_jobs(
                    sched,
                    credit_report_poll_job,
                    poll_id=CREDIT_REPORT_JOB_ID,
                    deadline_id=CREDIT_REPORT_DEADLINE_JOB_ID,
                    name="Credit Report Excel poll",
                    interval_hours=cr_cfg.interval_hours,
                    end_time=cr_cfg.end_time,
                    immediate=False,
                )
                logger.info(
                    "Credit Report jobs registered at startup: every %dh, deadline %s.",
                    cr_cfg.interval_hours,
                    cr_cfg.end_time,
                )
        except Exception:  # noqa: BLE001
            logger.warning("Credit Report job boot-registration skipped.", exc_info=True)

        # Boot-register the daily stale-folder cleanup job if enabled in the DB.
        try:
            from ..models.cleanup_config import CleanupConfig  # noqa: PLC0415
            from ..services.cron.cleanup import cleanup_old_folders_job  # noqa: PLC0415

            cl_cfg = await CleanupConfig.find_one({"key": "default"})
            if cl_cfg is not None and cl_cfg.enabled:
                schedule_cleanup_job(
                    sched,
                    cleanup_old_folders_job,
                    job_id=CLEANUP_JOB_ID,
                    run_hour=cl_cfg.run_hour,
                )
                logger.info(
                    "Cleanup job registered at startup: daily at %02d:00 (retention %dd).",
                    cl_cfg.run_hour,
                    cl_cfg.retention_days,
                )
        except Exception:  # noqa: BLE001
            logger.warning("Cleanup job boot-registration skipped.", exc_info=True)

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


async def apply_jsw_stock_schedule() -> None:
    """Add/replace or remove the JSW Stock poll + deadline jobs from live config.

    Called by ``config_service.upsert_config`` after every config save. When
    enabled, (re)schedules the interval poll (firing immediately) plus the daily
    ``end_time`` deadline alert; when disabled, removes both. Tolerates the
    scheduler not running (no-op). Local imports avoid the import cycle.
    """
    sched = get_scheduler()
    if sched is None:
        logger.warning("apply_jsw_stock_schedule: scheduler not running — skipped.")
        return

    try:
        from ..models.jsw_stock_config import JswStockConfig  # noqa: PLC0415
        from ..services.cron.jsw_stock import jsw_stock_poll_job  # noqa: PLC0415

        cfg = await JswStockConfig.find_one({"key": "default"})
        if cfg is not None and cfg.enabled:
            schedule_stock_jobs(
                sched,
                jsw_stock_poll_job,
                poll_id=JSW_STOCK_JOB_ID,
                deadline_id=JSW_STOCK_DEADLINE_JOB_ID,
                name="JSW Stock Excel poll",
                interval_hours=cfg.interval_hours,
                end_time=cfg.end_time,
                immediate=True,
            )
            logger.info(
                "JSW Stock jobs scheduled — every %dh, deadline alert at %s.",
                cfg.interval_hours,
                cfg.end_time,
            )
        else:
            remove_stock_jobs(sched, JSW_STOCK_JOB_ID, JSW_STOCK_DEADLINE_JOB_ID)
            logger.info("JSW Stock jobs removed (disabled).")
    except Exception:  # noqa: BLE001
        logger.warning("apply_jsw_stock_schedule failed.", exc_info=True)


async def apply_jvml_stock_schedule() -> None:
    """Add/replace or remove the JVML Stock poll + deadline jobs from live config.

    Mirrors :func:`apply_jsw_stock_schedule`. Called by
    ``jvml_stock.config_service.upsert_config`` after every config save.
    """
    sched = get_scheduler()
    if sched is None:
        logger.warning("apply_jvml_stock_schedule: scheduler not running — skipped.")
        return

    try:
        from ..models.jvml_stock_config import JvmlStockConfig  # noqa: PLC0415
        from ..services.cron.jvml_stock import jvml_stock_poll_job  # noqa: PLC0415

        cfg = await JvmlStockConfig.find_one({"key": "default"})
        if cfg is not None and cfg.enabled:
            schedule_stock_jobs(
                sched,
                jvml_stock_poll_job,
                poll_id=JVML_STOCK_JOB_ID,
                deadline_id=JVML_STOCK_DEADLINE_JOB_ID,
                name="JVML Stock Excel poll",
                interval_hours=cfg.interval_hours,
                end_time=cfg.end_time,
                immediate=True,
            )
            logger.info(
                "JVML Stock jobs scheduled — every %dh, deadline alert at %s.",
                cfg.interval_hours,
                cfg.end_time,
            )
        else:
            remove_stock_jobs(sched, JVML_STOCK_JOB_ID, JVML_STOCK_DEADLINE_JOB_ID)
            logger.info("JVML Stock jobs removed (disabled).")
    except Exception:  # noqa: BLE001
        logger.warning("apply_jvml_stock_schedule failed.", exc_info=True)


async def apply_credit_report_schedule() -> None:
    """Add/replace or remove the Credit Report poll + deadline jobs from live config.

    Mirrors :func:`apply_jvml_stock_schedule`. Called by
    ``credit_report.config_service.upsert_config`` after every config save.
    """
    sched = get_scheduler()
    if sched is None:
        logger.warning("apply_credit_report_schedule: scheduler not running — skipped.")
        return

    try:
        from ..models.credit_report_config import CreditReportConfig  # noqa: PLC0415
        from ..services.cron.credit_report import credit_report_poll_job  # noqa: PLC0415

        cfg = await CreditReportConfig.find_one({"key": "default"})
        if cfg is not None and cfg.enabled:
            schedule_stock_jobs(
                sched,
                credit_report_poll_job,
                poll_id=CREDIT_REPORT_JOB_ID,
                deadline_id=CREDIT_REPORT_DEADLINE_JOB_ID,
                name="Credit Report Excel poll",
                interval_hours=cfg.interval_hours,
                end_time=cfg.end_time,
                immediate=True,
            )
            logger.info(
                "Credit Report jobs scheduled — every %dh, deadline alert at %s.",
                cfg.interval_hours,
                cfg.end_time,
            )
        else:
            remove_stock_jobs(sched, CREDIT_REPORT_JOB_ID, CREDIT_REPORT_DEADLINE_JOB_ID)
            logger.info("Credit Report jobs removed (disabled).")
    except Exception:  # noqa: BLE001
        logger.warning("apply_credit_report_schedule failed.", exc_info=True)


async def apply_cleanup_schedule() -> None:
    """Add/replace or remove the daily stale-folder cleanup job from live config.

    Called by ``cleanup.config_service.upsert_config`` after every save. When
    enabled, (re)schedules the daily cleanup at ``run_hour`` (LOCAL tz); when
    disabled, removes it. Tolerates the scheduler not running (no-op).
    """
    sched = get_scheduler()
    if sched is None:
        logger.warning("apply_cleanup_schedule: scheduler not running — skipped.")
        return

    try:
        from ..models.cleanup_config import CleanupConfig  # noqa: PLC0415
        from ..services.cron.cleanup import cleanup_old_folders_job  # noqa: PLC0415

        cfg = await CleanupConfig.find_one({"key": "default"})
        if cfg is not None and cfg.enabled:
            schedule_cleanup_job(
                sched,
                cleanup_old_folders_job,
                job_id=CLEANUP_JOB_ID,
                run_hour=cfg.run_hour,
            )
            logger.info(
                "Cleanup job scheduled — daily at %02d:00 (retention %dd).",
                cfg.run_hour,
                cfg.retention_days,
            )
        else:
            remove_stock_jobs(sched, CLEANUP_JOB_ID)
            logger.info("Cleanup job removed (disabled).")
    except Exception:  # noqa: BLE001
        logger.warning("apply_cleanup_schedule failed.", exc_info=True)

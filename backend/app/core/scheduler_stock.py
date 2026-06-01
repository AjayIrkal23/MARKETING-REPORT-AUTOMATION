"""Stock-poll scheduling helpers (JSW + JVML).

Extracted from ``scheduler.py`` to keep that module lean (≤250 lines). These
helpers register / remove the interval poll job **and** a daily ``end_time``
deadline job per stock domain.

Why a deadline job
------------------
The missing-file alert in ``poller.run_poll`` only fires when a poll runs with
the LOCAL clock at or past ``end_time`` (BE-14). An ``IntervalTrigger`` alone
does **not** guarantee a tick lands inside ``[end_time, midnight]`` — so on many
interval/​start-time combinations the alert email silently never goes out. A
``CronTrigger`` pinned to ``end_time`` in the server's LOCAL timezone (matching
``run_poll``'s naive local clock) guarantees exactly one deterministic
missing-file check per day. ``run_poll`` is idempotent and self-guarding
(``status == "alerted"``), so the extra trigger can never double-send.

APScheduler trigger classes are imported lazily inside the functions so simply
importing this module never hard-requires APScheduler (mirrors ``scheduler.py``).
"""

from __future__ import annotations

from datetime import datetime, tzinfo
from typing import TYPE_CHECKING, Awaitable, Callable

if TYPE_CHECKING:
    from apscheduler.schedulers.asyncio import AsyncIOScheduler


def local_tzinfo() -> tzinfo | None:
    """Return the server's local tzinfo — matches ``run_poll``'s naive clock."""
    return datetime.now().astimezone().tzinfo


def schedule_stock_jobs(
    sched: AsyncIOScheduler,
    job_func: Callable[[], Awaitable[None]],
    *,
    poll_id: str,
    deadline_id: str,
    name: str,
    interval_hours: int,
    end_time: str,
    immediate: bool,
) -> None:
    """(Re)register the interval poll job + the daily ``end_time`` deadline job.

    Args:
        sched: The running scheduler.
        job_func: The poll job (a ``run_poll`` wrapper). Idempotent and safe to
            run from both triggers — the missing-file alert fires at most once
            per day via the ingestion ``status`` guard.
        poll_id / deadline_id: Stable APScheduler job ids for the two triggers.
        name: Human-readable base job name.
        interval_hours: Poll cadence in hours (1–24).
        end_time: ``HH:MM`` deadline; the cron fires here in LOCAL timezone.
        immediate: When True the interval poll also runs once right now
            (``next_run_time``) so a config save takes effect instantly.
    """
    from apscheduler.triggers.cron import CronTrigger  # noqa: PLC0415
    from apscheduler.triggers.interval import IntervalTrigger  # noqa: PLC0415

    poll_kwargs: dict[str, object] = {
        "trigger": IntervalTrigger(hours=interval_hours),
        "id": poll_id,
        "name": name,
        "replace_existing": True,
        "misfire_grace_time": 300,
    }
    if immediate:
        poll_kwargs["next_run_time"] = datetime.now()
    sched.add_job(job_func, **poll_kwargs)

    hour, minute = (int(part) for part in end_time.split(":"))
    sched.add_job(
        job_func,
        trigger=CronTrigger(hour=hour, minute=minute, timezone=local_tzinfo()),
        id=deadline_id,
        name=f"{name} (deadline alert)",
        replace_existing=True,
        misfire_grace_time=3600,
    )


def remove_stock_jobs(sched: AsyncIOScheduler, *job_ids: str) -> None:
    """Remove each job id if present (guards APScheduler ``JobLookupError``)."""
    for job_id in job_ids:
        if sched.get_job(job_id) is not None:
            sched.remove_job(job_id)

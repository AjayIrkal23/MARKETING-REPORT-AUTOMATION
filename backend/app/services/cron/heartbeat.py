"""Cron job utilities: ``audited_job`` decorator + ``heartbeat_job``.

``audited_job`` wraps any async job function so every run automatically emits
a ``cron`` audit entry — success with wall-clock duration, or error with the
exception message.  The decorator re-raises on failure so APScheduler records
the misfire and can apply retry/misfire policies.

``heartbeat_job`` is a lightweight liveness probe: it counts the total number
of ``AuditLog`` documents in the collection and logs the result.  Its primary
purpose is to confirm end-to-end that the scheduler, DB connection, and cron
auditing are all working correctly.

Contract: SPEC A7 of .planning/audit/SPEC.md.
"""

from __future__ import annotations

import functools
import logging
import time
from collections.abc import Callable, Coroutine
from typing import Any, TypeVar

from ..audit.events import audit_cron_event

logger = logging.getLogger(__name__)

_F = TypeVar("_F", bound=Callable[..., Coroutine[Any, Any, Any]])


def audited_job(action: str) -> Callable[[_F], _F]:
    """Decorator factory: wrap an async job so every run is auto-audited.

    On success, emits a ``cron`` audit entry with ``outcome="success"`` and the
    wall-clock ``duration_ms``.

    On exception, emits a ``cron`` audit entry with ``outcome="error"`` and a
    structured ``error`` dict, then **re-raises** so the scheduler can record
    the misfire.

    Args:
        action: Dot-namespaced job identifier used as the audit ``action``
                field, e.g. ``"cron.heartbeat"``.

    Example::

        @audited_job("cron.my_task")
        async def my_task() -> None:
            ...
    """

    def decorator(fn: _F) -> _F:
        @functools.wraps(fn)
        async def wrapper(*args: Any, **kwargs: Any) -> Any:
            start = time.perf_counter()
            try:
                result = await fn(*args, **kwargs)
                duration = round((time.perf_counter() - start) * 1000, 2)
                await audit_cron_event(
                    action,
                    f"cron job {action} completed",
                    outcome="success",
                    duration_ms=duration,
                )
                return result
            except Exception as exc:  # noqa: BLE001
                duration = round((time.perf_counter() - start) * 1000, 2)
                await audit_cron_event(
                    action,
                    f"cron job {action} failed: {exc}",
                    outcome="error",
                    duration_ms=duration,
                    error={"code": "CRON_ERROR", "message": str(exc)},
                )
                raise  # re-raise so APScheduler records the misfire

        return wrapper  # type: ignore[return-value]

    return decorator


@audited_job("cron.heartbeat")
async def heartbeat_job() -> None:
    """Lightweight liveness probe; confirms cron auditing works end-to-end.

    Counts the total number of ``AuditLog`` documents in the collection and
    logs the result at INFO level.  If the DB is unreachable the exception
    propagates to ``audited_job`` which audits it as ``outcome="error"`` before
    re-raising for APScheduler's misfire tracking.
    """
    from ...models import AuditLog  # noqa: PLC0415 — local import avoids circular import

    count = await AuditLog.find().count()
    logger.info("audit heartbeat: %d audit log(s) in collection.", count)

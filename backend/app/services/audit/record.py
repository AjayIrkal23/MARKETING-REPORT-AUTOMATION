"""Audit write primitives: record_audit (async, never-raises) and spawn_audit (fire-and-forget).

These are the lowest-level audit write helpers.  All other audit helpers
(``events.py``) delegate here.  The local import of ``AuditLog`` inside
``record_audit`` is intentional — it avoids a circular import at startup
because the model package imports Beanie which may not be initialised yet
when this module is first imported.

Contract: SPEC A3 of .planning/audit/SPEC.md.
"""

from __future__ import annotations

import asyncio
import logging
from typing import Any

logger = logging.getLogger(__name__)

# Module-level set that holds strong references to in-flight tasks so the
# event loop does not garbage-collect them before they complete.
_pending: set[asyncio.Task[None]] = set()


async def record_audit(
    *,
    category: str,
    action: str,
    summary: str = "",
    outcome: str = "success",
    source: str = "service",
    method: str | None = None,
    path: str | None = None,
    route: str | None = None,
    status_code: int | None = None,
    duration_ms: float | None = None,
    actor_email: str | None = None,
    actor_is_admin: bool | None = None,
    ip: str | None = None,
    user_agent: str | None = None,
    request_id: str | None = None,
    request_meta: dict[str, Any] | None = None,
    response_meta: dict[str, Any] | None = None,
    error: dict[str, Any] | None = None,
    extra: dict[str, Any] | None = None,
) -> None:
    """Persist one audit entry.

    **NEVER raises** — audit failures must not propagate into callers.
    Any DB or serialisation error is logged at ERROR level and swallowed.
    """
    try:
        # Local import: keeps startup import graph acyclic.  Beanie must be
        # initialised (``init_db`` called) before this coroutine runs, which
        # is always the case because audit writes only happen after app startup.
        from ...models import AuditLog  # noqa: PLC0415

        doc = AuditLog(
            category=category,
            action=action,
            summary=summary,
            outcome=outcome,
            source=source,
            method=method,
            path=path,
            route=route,
            status_code=status_code,
            duration_ms=duration_ms,
            actor_email=actor_email,
            actor_is_admin=actor_is_admin,
            ip=ip,
            user_agent=user_agent,
            request_id=request_id,
            request_meta=request_meta,
            response_meta=response_meta,
            error=error,
            extra=extra,
        )
        await doc.insert()
    except Exception:  # noqa: BLE001
        logger.exception("audit write failed (action=%s)", action)


def spawn_audit(**kwargs: Any) -> None:
    """Schedule a fire-and-forget audit write; does not block the response.

    Creates an ``asyncio.Task`` and keeps a strong reference in ``_pending``
    so the event loop cannot garbage-collect it before it finishes.  The task
    removes itself from the set via a done-callback once complete.

    If there is no running event loop (e.g. during interpreter teardown or in
    a synchronous test context) the call is silently dropped with a DEBUG log.
    """
    try:
        task: asyncio.Task[None] = asyncio.create_task(record_audit(**kwargs))
        _pending.add(task)
        task.add_done_callback(_pending.discard)
    except RuntimeError:
        # No running event loop — best-effort drop.
        logger.debug("spawn_audit skipped: no running event loop")

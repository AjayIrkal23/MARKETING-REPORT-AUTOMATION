"""Cleanup Config service — singleton get and upsert.

- :func:`get_config`    — return the ``"default"`` singleton or schema defaults
  if it has never been saved (no DB write on first call).
- :func:`upsert_config` — find-or-create the singleton, apply the validated PUT
  body, bump ``updated_at``, save, and (re)schedule the daily APScheduler job.
  The HTTP mutation itself is auto-audited by ``AuditMiddleware``, so no explicit
  audit event is emitted here.

Circular-import avoidance (mirrors credit_report.config_service / BE-15):
    ``scheduler → services.cron.cleanup → services.cleanup.runner`` and
    ``config_service → core.scheduler`` would cycle, so
    ``apply_cleanup_schedule`` is imported **locally** inside :func:`upsert_config`.
"""

from __future__ import annotations

from datetime import datetime, timezone

from ...models.cleanup_config import CleanupConfig
from ...schemas.cleanup_config import CleanupConfigPublic, CleanupConfigUpdate
from .runner import _to_public


def _now_utc() -> datetime:
    """Return current UTC datetime."""
    return datetime.now(timezone.utc)


async def get_config() -> CleanupConfigPublic:
    """Return the singleton cleanup policy, or schema defaults if absent.

    A GET is always non-mutating: when the doc does not exist yet, schema
    defaults are returned (``updated_at=None`` signals "never configured").
    """
    return _to_public(await CleanupConfig.find_one({"key": "default"}))


async def upsert_config(body: CleanupConfigUpdate) -> CleanupConfigPublic:
    """Find-or-create the singleton, apply PUT body, save, and reschedule."""
    # Local import breaks the scheduler ↔ service cycle (see module docstring).
    from ...core.scheduler import apply_cleanup_schedule  # noqa: PLC0415

    doc = await CleanupConfig.find_one({"key": "default"})
    now = _now_utc()

    if doc is None:
        doc = CleanupConfig(
            key="default",
            enabled=body.enabled,
            retention_days=body.retention_days,
            run_hour=body.run_hour,
            created_at=now,
            updated_at=now,
        )
        await doc.insert()
    else:
        doc.enabled = body.enabled
        doc.retention_days = body.retention_days
        doc.run_hour = body.run_hour
        doc.updated_at = now
        await doc.save()

    # (Re)schedule or remove the daily job. Tolerates scheduler=None (no-op).
    await apply_cleanup_schedule()

    return _to_public(doc)

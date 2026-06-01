"""Credit Report Config service — singleton get and upsert.

Provides two public coroutines:

- :func:`get_config` — return the ``"default"`` singleton or schema defaults if
  it has never been saved (no DB write on first call).
- :func:`upsert_config` — find-or-create the singleton, apply the validated PUT
  body, bump ``updated_at``, save, reschedule the APScheduler job, and emit an
  audit event.

Circular-import avoidance (B-9 / BE-15):
    ``scheduler.py → services.cron.credit_report → services.credit_report.poller →
    services.credit_report.config_service → scheduler.py``

    ``apply_credit_report_schedule`` is therefore imported **locally** inside
    :func:`upsert_config` at call time, not at module import time.
"""

from __future__ import annotations

from datetime import datetime, timezone

from ...models.credit_report_config import CreditReportConfig
from ...schemas.credit_report_config import CreditReportConfigPublic, CreditReportConfigUpdate
from ..audit.events import audit_credit_report_event


# ---------------------------------------------------------------------------
# Private helpers
# ---------------------------------------------------------------------------


def _now_utc() -> datetime:
    """Return current UTC datetime."""
    return datetime.now(timezone.utc)


def _to_public(doc: CreditReportConfig) -> CreditReportConfigPublic:
    """Map a :class:`CreditReportConfig` document to the public DTO.

    ``notify_emails`` is cast to ``list[str]`` to shed the ``EmailStr``
    subtype annotation from the update body (safe — EmailStr is a str subtype).
    ``updated_at`` may be ``None`` until the doc is first explicitly saved
    via a PUT (the model default_factory sets it on insert, but returning
    defaults without a DB write preserves ``None`` for the never-saved case).
    """
    return CreditReportConfigPublic(
        enabled=doc.enabled,
        base_path=doc.base_path,
        file_name=doc.file_name,
        start_time=doc.start_time,
        end_time=doc.end_time,
        interval_hours=doc.interval_hours,
        notify_emails=list(doc.notify_emails),
        updated_at=doc.updated_at,
    )


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


async def get_config() -> CreditReportConfigPublic:
    """Return the singleton Credit Report config, or schema defaults if absent.

    The singleton is identified by ``key="default"``.  On first boot (before
    any PUT request has been made) the document does not exist; instead of
    creating a document, schema defaults are returned directly so that a GET
    is always non-mutating.

    Returns:
        :class:`CreditReportConfigPublic` — either from DB or hard-coded defaults.
    """
    doc = await CreditReportConfig.find_one({"key": "default"})
    if doc is None:
        # Return schema defaults without persisting — first explicit PUT
        # from the admin UI creates the document.  updated_at is None to
        # signal "never configured" to the frontend status panel.
        return CreditReportConfigPublic(
            enabled=False,
            base_path="",
            file_name="",
            start_time="08:00",
            end_time="20:00",
            interval_hours=1,
            notify_emails=[],
            updated_at=None,
        )
    return _to_public(doc)


async def upsert_config(
    body: CreditReportConfigUpdate,
    *,
    actor_email: str | None,
) -> CreditReportConfigPublic:
    """Find-or-create the singleton, apply PUT body, reschedule, and audit.

    Behaviour:
    - If no ``"default"`` doc exists: insert a new document with all fields
      from ``body`` plus ``created_at`` / ``updated_at`` = now UTC.
    - If the doc exists: update every mutable field and bump ``updated_at``.
    - After saving: call :func:`apply_credit_report_schedule` (local import to
      break the scheduler ↔ service circular dependency — BE-15 / B-9).
    - Emit ``"credit_report.config_updated"`` audit event with ``actor_email`` and
      a compact ``extra`` payload (enabled flag, interval, email count).

    Args:
        body:        Validated PUT body from :class:`CreditReportConfigUpdate`.
        actor_email: Admin's email address threaded from the request dependency;
                     ``None`` if unavailable.

    Returns:
        :class:`CreditReportConfigPublic` reflecting the saved state.
    """
    # Local import avoids circular dependency:
    #   scheduler.py → services.cron.credit_report → services.credit_report.poller
    #   → services.credit_report.config_service → scheduler.py  ← cycle!
    # By importing at call time the module graph is acyclic at import time.
    from ...core.scheduler import apply_credit_report_schedule  # noqa: PLC0415

    doc = await CreditReportConfig.find_one({"key": "default"})
    now = _now_utc()

    if doc is None:
        # First-time save — insert the document.
        doc = CreditReportConfig(
            key="default",
            enabled=body.enabled,
            base_path=body.base_path,
            file_name=body.file_name,
            start_time=body.start_time,
            end_time=body.end_time,
            interval_hours=body.interval_hours,
            notify_emails=list(body.notify_emails),
            created_at=now,
            updated_at=now,
        )
        await doc.insert()
    else:
        # Existing singleton — overwrite every mutable field (full-replacement
        # PUT semantics) and bump updated_at.
        doc.enabled = body.enabled
        doc.base_path = body.base_path
        doc.file_name = body.file_name
        doc.start_time = body.start_time
        doc.end_time = body.end_time
        doc.interval_hours = body.interval_hours
        doc.notify_emails = list(body.notify_emails)
        doc.updated_at = now
        await doc.save()

    # (Re)schedule or remove the APScheduler job based on the new config.
    # Tolerates scheduler=None (logs warning, no-op) — BE-11 / B-5.
    await apply_credit_report_schedule()

    # Emit structured audit event — category="credit_report" (BE-13: singular).
    await audit_credit_report_event(
        "credit_report.config_updated",
        "Credit Report Excel config updated",
        outcome="success",
        actor_email=actor_email,
        extra={
            "enabled": body.enabled,
            "interval_hours": body.interval_hours,
            "notify_count": len(body.notify_emails),
            "has_base_path": bool(body.base_path),
            "has_file_name": bool(body.file_name),
        },
    )

    return _to_public(doc)

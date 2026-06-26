"""Scheduled cleanup of stale date-wise ingestion folders (files only)."""

from __future__ import annotations

from ..cron import audited_job  # re-exported from services/cron/__init__.py


@audited_job("cron.cleanup")
async def cleanup_old_folders_job() -> None:
    """Delete ingestion date folders older than the configured retention window.

    Thin cron entry point: defers to ``services.cleanup.runner.run_cleanup``,
    which respects the ``enabled`` flag and never raises. The @audited_job
    wrapper emits a ``cron.cleanup`` audit entry on completion/failure.
    Local import avoids the scheduler → cron → service import cycle.
    """
    from ...services.cleanup.runner import run_cleanup  # noqa: PLC0415

    await run_cleanup()

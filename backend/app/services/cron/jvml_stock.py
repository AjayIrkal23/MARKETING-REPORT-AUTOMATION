"""Scheduled poll job for JVML Stock Excel ingestion."""

from __future__ import annotations

from ..cron import audited_job  # re-exported from services/cron/__init__.py


@audited_job("cron.jvml_stock_poll")
async def jvml_stock_poll_job() -> None:
    """Poll for the daily JVML Stock Excel file and ingest it when found.

    Local import avoids import cycles between scheduler → cron → services.
    The @audited_job wrapper emits a cron audit entry on success/error and
    re-raises on failure so APScheduler records the misfire.
    """
    from ...services.jvml_stock.poller import run_poll  # noqa: PLC0415

    await run_poll()

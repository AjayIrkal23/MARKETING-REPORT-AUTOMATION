"""Scheduled poll job for JSW Stock Excel ingestion."""

from __future__ import annotations

from ..cron import audited_job  # re-exported from services/cron/__init__.py


@audited_job("cron.jsw_stock_poll")
async def jsw_stock_poll_job() -> None:
    """Poll for the daily JSW Stock Excel file and ingest it when found.

    Local import avoids import cycles between scheduler → cron → services.
    The @audited_job wrapper emits a cron audit entry on success/error and
    re-raises on failure so APScheduler records the misfire.
    """
    from ...services.jsw_stock.poller import run_poll  # noqa: PLC0415

    await run_poll()

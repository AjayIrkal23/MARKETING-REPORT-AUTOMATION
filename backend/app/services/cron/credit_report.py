"""Scheduled poll job for Credit Report Excel ingestion."""

from __future__ import annotations

from ..cron import audited_job  # re-exported from services/cron/__init__.py


@audited_job("cron.credit_report_poll")
async def credit_report_poll_job() -> None:
    """Poll for the daily Credit Report Excel file and ingest it when found.

    Local import avoids import cycles between scheduler → cron → services.
    The @audited_job wrapper emits a cron audit entry on success/error and
    re-raises on failure so APScheduler records the misfire.
    """
    from ...services.credit_report.poller import run_poll  # noqa: PLC0415

    await run_poll()

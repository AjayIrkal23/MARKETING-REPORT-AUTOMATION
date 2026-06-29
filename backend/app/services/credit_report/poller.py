"""Credit Report daily poll entrypoints."""

from __future__ import annotations

import logging
import os
from datetime import datetime
from datetime import time as dt_time

from beanie import PydanticObjectId

from ...core.errors import NotFoundError
from ...models.credit_report_config import CreditReportConfig
from ...models.region import Region
from ...schemas.credit_report_config import CreditReportStatusPublic
from .config_service import get_config
from .emails import send_missing_alert
from .ingest import ingest_file
from .status import get_status
from .zone_polling import (
    active_regions,
    get_or_create_ingestion,
    resolve_report_file,
    run_regions,
)

logger = logging.getLogger(__name__)


def _parse_hhmm(s: str) -> dt_time:
    h, m = map(int, s.split(":"))
    return dt_time(h, m)


async def _run_flat(
    cfg: CreditReportConfig,
    today: str,
    *,
    send_alerts: bool,
) -> None:
    # Re-ingest on every in-window poll tick (no skip-once guard) — snapshot
    # refresh of today's rows; see jsw_stock/poller.py for the rationale.
    folder = os.path.join(cfg.base_path, today)
    os.makedirs(folder, exist_ok=True)
    ingestion = await get_or_create_ingestion(today)
    ingestion.zones = []

    fpath = resolve_report_file(folder, cfg.file_name)
    if fpath is None:
        if send_alerts:
            await send_missing_alert(cfg, today)
            ingestion.alerted_at = datetime.now()
        ingestion.status = "missing"
        ingestion.row_count = 0
        ingestion.file_path = None
        ingestion.error = f"File not found at {datetime.now().strftime('%H:%M')} on {today}"
    else:
        try:
            count = await ingest_file(fpath, today)
            ingestion.status = "ingested"
            ingestion.row_count = count
            ingestion.found_at = datetime.now()
            ingestion.file_path = fpath
            ingestion.error = None
        except Exception as exc:  # noqa: BLE001
            from ...services.audit.events import audit_credit_report_event  # noqa: PLC0415

            ingestion.status = "error"
            ingestion.error = str(exc)
            await audit_credit_report_event(
                "credit_report.failed",
                f"Ingest failed for {today}: {exc}",
                outcome="error",
                extra={"report_date": today, "error": str(exc)},
            )
            logger.exception("Credit report flat ingest failed for %s.", today)
    ingestion.dup_party_count = 0
    ingestion.last_run_at = datetime.now()
    ingestion.updated_at = ingestion.last_run_at
    await ingestion.save()


async def run_poll(*, force: bool = False) -> CreditReportStatusPublic:
    """Run the all-zone poll. Scheduled calls respect the start window."""
    try:
        cfg = await get_config()
        if not cfg.enabled or not cfg.base_path or not cfg.file_name:
            return await get_status()

        now = datetime.now()
        today = now.strftime("%d-%m-%Y")
        if not force and now.time() < _parse_hhmm(cfg.start_time):
            return await get_status()

        regions = await active_regions()
        if regions:
            await run_regions(
                cfg,
                today,
                regions,
                regions,
                send_alerts=True,
            )
        else:
            await _run_flat(cfg, today, send_alerts=True)
    except Exception:  # noqa: BLE001
        logger.exception("run_poll: unexpected error")
    return await get_status()


async def run_poll_zone(region_id: str) -> CreditReportStatusPublic:
    """Run one active region zone immediately, bypassing the time window."""
    cfg = await get_config()
    if not cfg.enabled or not cfg.base_path or not cfg.file_name:
        return await get_status()

    try:
        oid = PydanticObjectId(region_id)
    except Exception:
        raise NotFoundError("Active region not found.")
    region = await Region.get(oid)
    if region is None or not region.active:
        raise NotFoundError("Active region not found.")

    today = datetime.now().strftime("%d-%m-%Y")
    regions = await active_regions()
    await run_regions(
        cfg,
        today,
        regions,
        [region],
        send_alerts=False,
    )
    return await get_status()

"""Region-zone helpers for credit-report polling."""

from __future__ import annotations

import logging
import os
import re
from datetime import datetime

from ...models.credit_report import CreditReport
from ...models.credit_report_config import CreditReportConfig
from ...models.credit_report_ingestion import CreditReportIngestion, CreditReportZoneRun
from ...models.region import Region
from ...utils.shared.resolve import resolve_report_file
from .emails import send_missing_alert
from .ingest import ingest_region, purge_legacy_flat_rows

logger = logging.getLogger(__name__)

REPORT_SUBDIR = "CREDITREPORT"


def safe_dir(name: str) -> str:
    """Return a folder-safe region name without path traversal."""
    cleaned = re.sub(r"[/\\]+", "_", name.strip())
    while ".." in cleaned:
        cleaned = cleaned.replace("..", "_")
    cleaned = re.sub(r"_+", "_", cleaned)
    cleaned = cleaned.strip(" .")
    return cleaned if cleaned.strip("_") else "region"


async def active_regions() -> list[Region]:
    return await Region.find({"active": True}).sort("+name").to_list()


async def get_or_create_ingestion(report_date: str) -> CreditReportIngestion:
    ingestion = await CreditReportIngestion.find_one({"report_date": report_date})
    if ingestion is None:
        ingestion = CreditReportIngestion(report_date=report_date, status="pending")
        await ingestion.insert()
    return ingestion


def sync_zone_slots(
    ingestion: CreditReportIngestion,
    regions: list[Region],
) -> None:
    existing = {zone.region_id: zone for zone in ingestion.zones}
    synced: list[CreditReportZoneRun] = []
    for region in regions:
        region_id = str(region.id)
        zone = existing.get(region_id)
        if zone is None:
            zone = CreditReportZoneRun(region_id=region_id, name=region.name)
        else:
            zone.name = region.name
        synced.append(zone)
    ingestion.zones = synced


def zone_already_ingested(
    ingestion: CreditReportIngestion,
    region: Region,
) -> bool:
    region_id = str(region.id)
    return any(
        zone.region_id == region_id and zone.status == "ingested"
        for zone in ingestion.zones
    )


def mark_zone(
    ingestion: CreditReportIngestion,
    region: Region,
    *,
    status: str,
    row_count: int = 0,
    found_at: datetime | None = None,
    file_path: str | None = None,
    error: str | None = None,
) -> None:
    region_id = str(region.id)
    updated = CreditReportZoneRun(
        region_id=region_id,
        name=region.name,
        status=status,
        row_count=row_count,
        found_at=found_at,
        file_path=file_path,
        error=error,
    )
    for index, zone in enumerate(ingestion.zones):
        if zone.region_id == region_id:
            ingestion.zones[index] = updated
            return
    ingestion.zones.append(updated)


def roll_up(ingestion: CreditReportIngestion) -> None:
    statuses = [zone.status for zone in ingestion.zones]
    ingestion.row_count = sum(zone.row_count for zone in ingestion.zones)
    found_times = [zone.found_at for zone in ingestion.zones if zone.found_at]
    ingestion.found_at = max(found_times) if found_times else None
    ingestion.file_path = None
    errors = [f"{zone.name}: {zone.error}" for zone in ingestion.zones if zone.error]
    ingestion.error = "; ".join(errors) if errors else None

    if not statuses:
        ingestion.status = "pending"
    elif all(status == "ingested" for status in statuses):
        ingestion.status = "ingested"
    elif any(status == "ingested" for status in statuses):
        ingestion.status = "partial"
    elif any(status == "error" for status in statuses):
        ingestion.status = "error"
    elif any(status == "missing" for status in statuses):
        ingestion.status = "missing"
    else:
        ingestion.status = "pending"
    ingestion.updated_at = datetime.now()


async def count_dup_parties(report_date: str) -> int:
    docs = await CreditReport.find({"report_date": report_date}).to_list()
    regions_by_party: dict[str, set[str]] = {}
    for doc in docs:
        region_id = getattr(doc, "region_id", None)
        party = (doc.customer or "").strip()
        if region_id and party:
            regions_by_party.setdefault(party, set()).add(region_id)
    return sum(1 for region_ids in regions_by_party.values() if len(region_ids) > 1)


async def ingest_one_zone(
    cfg: CreditReportConfig,
    folder: str,
    today: str,
    region: Region,
    ingestion: CreditReportIngestion,
) -> None:
    zone_dir = os.path.join(folder, REPORT_SUBDIR, safe_dir(region.name))
    os.makedirs(zone_dir, exist_ok=True)
    fpath = resolve_report_file(zone_dir, cfg.file_name)
    if fpath is None:
        mark_zone(ingestion, region, status="missing")
        return

    try:
        count = await ingest_region(fpath, today, str(region.id))
        mark_zone(
            ingestion,
            region,
            status="ingested",
            row_count=count,
            found_at=datetime.now(),
            file_path=fpath,
        )
    except Exception as exc:  # noqa: BLE001
        from ...services.audit.events import audit_credit_report_event  # noqa: PLC0415

        mark_zone(ingestion, region, status="error", error=str(exc))
        await audit_credit_report_event(
            "credit_report.failed",
            f"Ingest failed for {today} / {region.name}: {exc}",
            outcome="error",
            extra={"report_date": today, "region_id": str(region.id), "error": str(exc)},
        )
        logger.exception("Credit report zone ingest failed for %s.", region.name)


async def run_regions(
    cfg: CreditReportConfig,
    today: str,
    all_regions: list[Region],
    regions_to_run: list[Region],
    *,
    force: bool,
    send_alerts: bool,
) -> None:
    folder = os.path.join(cfg.base_path, today)
    os.makedirs(os.path.join(folder, REPORT_SUBDIR), exist_ok=True)
    await purge_legacy_flat_rows()
    ingestion = await get_or_create_ingestion(today)
    sync_zone_slots(ingestion, all_regions)

    for region in regions_to_run:
        if not force and zone_already_ingested(ingestion, region):
            continue
        await ingest_one_zone(cfg, folder, today, region, ingestion)

    roll_up(ingestion)
    ingestion.dup_party_count = await count_dup_parties(today)
    missing_zones = [zone.name for zone in ingestion.zones if zone.status == "missing"]
    if missing_zones and send_alerts:
        await send_missing_alert(cfg, today, missing_zones)
        ingestion.alerted_at = datetime.now()
    await ingestion.save()

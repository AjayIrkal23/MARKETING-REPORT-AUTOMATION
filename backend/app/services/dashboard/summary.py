"""Dashboard summary service — today's ingestion status across all three domains.

For the local calendar date (``dd-mm-yyyy`` — matching the poller, which uses the
LOCAL clock, BE-14), fetch each domain's ingestion record and config singleton,
then derive the ``extracted`` / ``missing`` booleans the dashboard cards render.

All six lookups run concurrently via ``asyncio.gather`` (one ``find_one`` per
collection — O(1) round-trips, ``backend-performance-standards``). Missing
documents degrade gracefully: no ingestion row → status ``"none"``; no config →
``enabled=False``.
"""

from __future__ import annotations

import asyncio
from datetime import datetime

from ...models.credit_report_config import CreditReportConfig
from ...models.credit_report_ingestion import CreditReportIngestion
from ...models.jsw_stock_config import JswStockConfig
from ...models.jsw_stock_ingestion import JswStockIngestion
from ...models.jvml_stock_config import JvmlStockConfig
from ...models.jvml_stock_ingestion import JvmlStockIngestion
from ...models.region import Region
from ...schemas.dashboard import DashboardReportStatus, DashboardSummary, DashboardZoneStatus

# Raw ingestion-status values → dashboard booleans.
_EXTRACTED_STATUS = "ingested"
_MISSING_STATUSES = frozenset({"missing", "alerted", "partial"})

# (key, label, ingestion_model, config_model) — order = card display order.
_DOMAINS = (
    ("jsw_stock", "JSW Stock Excel", JswStockIngestion, JswStockConfig),
    ("jvml_stock", "JVML Stock Excel", JvmlStockIngestion, JvmlStockConfig),
    ("credit_report", "Credit Report Excel", CreditReportIngestion, CreditReportConfig),
)


def _credit_zone_statuses(
    ingestion: CreditReportIngestion | None,
    active_regions: list[Region],
) -> list[DashboardZoneStatus]:
    existing = {zone.region_id: zone for zone in (ingestion.zones if ingestion else [])}
    zones: list[DashboardZoneStatus] = []
    for region in active_regions:
        region_id = str(region.id)
        zone = existing.get(region_id)
        zones.append(
            DashboardZoneStatus(
                region_id=region_id,
                name=region.name,
                status=zone.status if zone else "pending",
                row_count=zone.row_count if zone else 0,
                found_at=zone.found_at if zone else None,
            )
        )
    return zones


def _today_local() -> str:
    """Return today's date as ``dd-mm-yyyy`` using the LOCAL clock.

    Must match the poller's date-folder convention (``poller.run_poll`` uses
    ``datetime.now()`` local, BE-14) so the lookup hits the right ``report_date``.
    Using UTC here would mismatch the stored records around midnight.
    """
    return datetime.now().strftime("%d-%m-%Y")


async def _report_status(
    key: str,
    label: str,
    ingestion_model: type,
    config_model: type,
    today: str,
    active_regions: list[Region],
) -> DashboardReportStatus:
    """Build one domain's today-status card payload.

    Fetches the domain's ingestion record for *today* and its config singleton
    concurrently, then maps the raw ``status`` to the ``extracted`` / ``missing``
    contract booleans.
    """
    ingestion, config = await asyncio.gather(
        ingestion_model.find_one({"report_date": today}),
        config_model.find_one({"key": "default"}),
    )

    status: str = ingestion.status if ingestion is not None else "none"

    return DashboardReportStatus(
        key=key,  # type: ignore[arg-type]
        label=label,
        report_date=today,
        status=status,
        extracted=status == _EXTRACTED_STATUS,
        missing=status in _MISSING_STATUSES,
        row_count=ingestion.row_count if ingestion is not None else 0,
        found_at=ingestion.found_at if ingestion is not None else None,
        last_run_at=ingestion.last_run_at if ingestion is not None else None,
        enabled=config.enabled if config is not None else False,
        zones=_credit_zone_statuses(ingestion, active_regions)
        if key == "credit_report"
        else [],
    )


async def get_dashboard_summary() -> DashboardSummary:
    """Return today's ingestion status for all three report domains.

    Returns:
        DashboardSummary with ``date`` (today's ``dd-mm-yyyy``) and one
        ``DashboardReportStatus`` per domain in display order.
    """
    today = _today_local()
    active_regions = await Region.find({"active": True}).sort("+name").to_list()

    reports = await asyncio.gather(
        *(
            _report_status(
                key,
                label,
                ingestion_model,
                config_model,
                today,
                active_regions,
            )
            for key, label, ingestion_model, config_model in _DOMAINS
        )
    )

    return DashboardSummary(date=today, reports=list(reports))

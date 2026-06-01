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
from ...schemas.dashboard import DashboardReportStatus, DashboardSummary

# Raw ingestion-status values → dashboard booleans.
_EXTRACTED_STATUS = "ingested"
_MISSING_STATUSES = frozenset({"missing", "alerted"})

# (key, label, ingestion_model, config_model) — order = card display order.
_DOMAINS = (
    ("jsw_stock", "JSW Stock Excel", JswStockIngestion, JswStockConfig),
    ("jvml_stock", "JVML Stock Excel", JvmlStockIngestion, JvmlStockConfig),
    ("credit_report", "Credit Report Excel", CreditReportIngestion, CreditReportConfig),
)


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
        enabled=config.enabled if config is not None else False,
    )


async def get_dashboard_summary() -> DashboardSummary:
    """Return today's ingestion status for all three report domains.

    Returns:
        DashboardSummary with ``date`` (today's ``dd-mm-yyyy``) and one
        ``DashboardReportStatus`` per domain in display order.
    """
    today = _today_local()

    reports = await asyncio.gather(
        *(
            _report_status(key, label, ingestion_model, config_model, today)
            for key, label, ingestion_model, config_model in _DOMAINS
        )
    )

    return DashboardSummary(date=today, reports=list(reports))

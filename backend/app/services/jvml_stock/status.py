"""JVML Stock status service.

GET /admin/jvml-stock/status  →  JvmlStockStatusPublic

Logic:
  1. Load JvmlStockConfig singleton (key="default") for the enabled flag.
  2. Fetch the most-recent 14 JvmlStockIngestion docs sorted created_at desc
     using the Beanie 2.1.0 fluent form: find().sort("-created_at").limit(N).to_list()
  3. latest = recent[0] if any docs exist, else None.
  4. Map latest fields → JvmlStockStatusPublic scalar fields.
  5. Map all 14 docs → JvmlStockIngestionRow list (recent[] in status response).

Notes:
  - GAP-4: all 14 recent rows are always included (not just the latest).
  - BE-19: fluent sort form used — confirmed working against Beanie 2.1.0 in this venv.
  - The config singleton may not exist (never saved) — defaults to enabled=False.
  - Never raises; callers (controller) wrap in try/except for 500 handling.
"""

from __future__ import annotations

from ...models.jvml_stock_config import JvmlStockConfig
from ...models.jvml_stock_ingestion import JvmlStockIngestion
from ...schemas.jvml_stock_config import JvmlStockIngestionRow, JvmlStockStatusPublic

# Number of recent ingestion records to include in the status response.
_RECENT_N = 14


async def get_status() -> JvmlStockStatusPublic:
    """Return config.enabled + latest ingestion summary + recent 14 ingestion rows.

    Steps:
      1. Fetch JvmlStockConfig singleton — ``enabled`` flag.
      2. Fetch recent _RECENT_N JvmlStockIngestion docs by ``created_at`` desc.
      3. ``latest = recent[0]`` if the list is non-empty, else ``None``.
      4. Build and return ``JvmlStockStatusPublic``.

    Returns:
        JvmlStockStatusPublic with scalar latest-ingestion fields plus the
        ``recent`` list of up to _RECENT_N ``JvmlStockIngestionRow`` objects.
    """
    # ------------------------------------------------------------------
    # Step 1 — Load config singleton for the enabled flag
    # ------------------------------------------------------------------
    config = await JvmlStockConfig.find_one({"key": "default"})
    enabled: bool = config.enabled if config is not None else False

    # ------------------------------------------------------------------
    # Step 2 — Fetch recent 14 ingestion docs (Beanie 2.1.0 fluent form)
    # ------------------------------------------------------------------
    recent_docs: list[JvmlStockIngestion] = (
        await JvmlStockIngestion.find()
        .sort("-created_at")
        .limit(_RECENT_N)
        .to_list()
    )

    # ------------------------------------------------------------------
    # Step 3 — latest is the first doc if any (sort is desc)
    # ------------------------------------------------------------------
    latest: JvmlStockIngestion | None = recent_docs[0] if recent_docs else None

    # ------------------------------------------------------------------
    # Step 4 — Map all _RECENT_N docs to JvmlStockIngestionRow DTOs
    # ------------------------------------------------------------------
    recent: list[JvmlStockIngestionRow] = [
        JvmlStockIngestionRow(
            report_date=doc.report_date,
            status=doc.status,
            row_count=doc.row_count,
            found_at=doc.found_at,
            created_at=doc.created_at,
        )
        for doc in recent_docs
    ]

    # ------------------------------------------------------------------
    # Step 5 — Build and return JvmlStockStatusPublic
    # ------------------------------------------------------------------
    return JvmlStockStatusPublic(
        enabled=enabled,
        last_report_date=latest.report_date if latest is not None else None,
        last_status=latest.status if latest is not None else None,
        last_row_count=latest.row_count if latest is not None else None,
        last_found_at=latest.found_at if latest is not None else None,
        last_alerted_at=latest.alerted_at if latest is not None else None,
        last_run_at=latest.last_run_at if latest is not None else None,
        last_error=latest.error if latest is not None else None,
        recent=recent,
    )

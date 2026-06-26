"""Run the stale-folder cleanup over the configured ingestion base paths.

``run_cleanup`` is the single entry point shared by the daily cron job and the
admin "run now" button. It reads the cleanup policy singleton, collects the
*distinct* ``base_path`` of every ingestion config (JSW / JVML / Credit Report),
deletes whole ``<base_path>/<dd-mm-yyyy>`` folders older than the retention
window, and records the run on the policy doc. DB ingestion records are never
touched — only files on disk.

Never raises: the per-folder delete in :func:`purge_old_date_folders` already
swallows + logs OS errors, and a disabled/absent config is a no-op.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone

from ...models.cleanup_config import CleanupConfig
from ...models.credit_report_config import CreditReportConfig
from ...models.jsw_stock_config import JswStockConfig
from ...models.jvml_stock_config import JvmlStockConfig
from ...schemas.cleanup_config import CleanupConfigPublic
from ...utils.shared.cleanup import purge_old_date_folders

logger = logging.getLogger(__name__)


def _to_public(doc: CleanupConfig | None) -> CleanupConfigPublic:
    """Map the policy doc (or defaults when never saved) to the public DTO."""
    if doc is None:
        return CleanupConfigPublic(
            enabled=False,
            retention_days=5,
            run_hour=3,
            last_run_at=None,
            last_deleted_count=0,
            updated_at=None,
        )
    return CleanupConfigPublic(
        enabled=doc.enabled,
        retention_days=doc.retention_days,
        run_hour=doc.run_hour,
        last_run_at=doc.last_run_at,
        last_deleted_count=doc.last_deleted_count,
        updated_at=doc.updated_at,
    )


async def _ingestion_base_paths() -> set[str]:
    """Return the distinct, non-empty base paths of the three ingestion configs."""
    paths: set[str] = set()
    for model in (JswStockConfig, JvmlStockConfig, CreditReportConfig):
        cfg = await model.find_one({"key": "default"})
        if cfg is not None and cfg.base_path:
            paths.add(cfg.base_path)
    return paths


async def run_cleanup() -> CleanupConfigPublic:
    """Purge stale date folders per the policy; record the run; return the state.

    Respects ``enabled`` (a disabled or never-saved policy is a no-op, mirroring
    the stock pollers' ``run_poll`` enabled-gate). Uses the LOCAL clock for
    "today" to match the ``dd-mm-yyyy`` folder names the pollers write.
    """
    cfg = await CleanupConfig.find_one({"key": "default"})
    if cfg is None or not cfg.enabled:
        logger.debug("run_cleanup: policy absent or disabled — skipping.")
        return _to_public(cfg)

    today = datetime.now().date()  # local clock — matches poller folder naming
    base_paths = await _ingestion_base_paths()

    total = 0
    for base_path in base_paths:
        deleted = purge_old_date_folders(
            base_path, today=today, retention_days=cfg.retention_days
        )
        total += len(deleted)

    cfg.last_run_at = datetime.now(timezone.utc)
    cfg.last_deleted_count = total
    await cfg.save()

    logger.info(
        "run_cleanup: removed %d stale folder(s) across %d base path(s) "
        "(retention=%dd).",
        total,
        len(base_paths),
        cfg.retention_days,
    )
    return _to_public(cfg)

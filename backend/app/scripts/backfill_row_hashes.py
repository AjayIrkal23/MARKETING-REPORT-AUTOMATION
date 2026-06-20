"""One-time backfill of row_hash for existing stock/credit-report documents.

Run from ``backend/``:

    ./.venv/bin/python -m app.scripts.backfill_row_hashes

The script:
  1. Computes and stores ``row_hash`` for every document that does not have one.
  2. Runs same-date duplicate cleanup for every distinct ``report_date``.

It is safe to run repeatedly — documents that already have a hash are skipped.
"""

from __future__ import annotations

import asyncio
import logging
from typing import Any

from beanie import Document

from ..core.database import close_db, init_db
from ..models.credit_report import CreditReport
from ..models.jsw_stock import JswStock
from ..models.jvml_stock import JvmlStock
from ..services.shared.ingest_cleanup import _row_hash, cleanup_duplicates

logger = logging.getLogger(__name__)

_META_EXCLUDE = {
    "id",
    "_id",
    "report_date",
    "source_file",
    "created_at",
    "updated_at",
    "row_hash",
}

_MODELS: list[type[Document]] = [JswStock, JvmlStock, CreditReport]


async def _backfill_model(model: type[Document]) -> tuple[int, int]:
    """Backfill row_hash for *model* and return (updated_count, deleted_count)."""
    docs_without_hash = await model.find({"row_hash": None}).to_list()
    updated = 0
    for doc in docs_without_hash:
        doc.row_hash = _row_hash(doc.model_dump(), exclude=_META_EXCLUDE)
        await doc.save()
        updated += 1
    logger.info("%s: backfilled row_hash for %d document(s)", model.__name__, updated)

    # Collect distinct report dates from the collection.
    all_dates = {doc.report_date async for doc in model.find({})}

    deleted = 0
    for report_date in sorted(all_dates):
        count = await cleanup_duplicates(model, report_date)
        if count:
            logger.info(
                "%s: %s — deleted %d duplicate row(s)",
                model.__name__,
                report_date,
                count,
            )
        deleted += count

    return updated, deleted


async def _main() -> None:
    logging.basicConfig(level=logging.INFO)
    await init_db()
    try:
        for model in _MODELS:
            updated, deleted = await _backfill_model(model)
            logger.info(
                "%s totals — updated: %d, deleted: %d",
                model.__name__,
                updated,
                deleted,
            )
    finally:
        await close_db()


if __name__ == "__main__":
    asyncio.run(_main())

"""JSW Stock Excel daily poll — file detection, ingest dispatch, and alert.

Entry point: ``run_poll() -> JswStockStatusPublic``.

Invariants (all guarded — never raises out of run_poll):
- Uses ``datetime.now()`` (LOCAL clock) to match config HH:MM window (BE-14).
- ``today`` is formatted ``dd-mm-yyyy`` to match the folder-name convention.
- ``os.makedirs(folder, exist_ok=True)`` creates the dated sub-folder on demand.
- Window: ``now.time() >= start`` is required to enter; polling then continues
  on every interval tick from start_time onward (no upper-bound gate).
- Ingestion is idempotent: ``JswStock.find(report_date=...).delete()`` runs first
  inside ``ingest_file`` before the bulk insert.
- Missing-file alert fires on EVERY poll tick while the file is absent (not just
  once at window end); cadence = the configured ``interval_hours``.
- Any exception during ingest → mark ``"error"`` + emit ``jsw_stock.failed`` audit.
  Never re-raises (``run_poll`` is a top-level job entry point; the ``@audited_job``
  cron wrapper handles the cron-level audit independently).

Module-level imports are safe here (B-9): ``poller.py`` is below
``config_service.py`` / ``emails.py`` / ``ingest.py`` / ``status.py`` in the
import chain — the cycle only exists through ``scheduler.py`` (which uses local
imports), not through this module.
"""

from __future__ import annotations

import logging
import os
from datetime import datetime
from datetime import time as dt_time

from ...models.jsw_stock_config import JswStockConfig
from ...models.jsw_stock_ingestion import JswStockIngestion
from ...schemas.jsw_stock_config import JswStockStatusPublic
from ...utils.shared.resolve import resolve_report_file
from .emails import send_missing_alert
from .ingest import ingest_file
from .status import get_status

logger = logging.getLogger(__name__)


def _parse_hhmm(s: str) -> dt_time:
    """Parse a zero-padded ``HH:MM`` string into a :class:`datetime.time`.

    Caller guarantees the format is valid (validated by ``JswStockConfigUpdate``).
    """
    h, m = map(int, s.split(":"))
    return dt_time(h, m)


async def run_poll() -> JswStockStatusPublic:
    """Detect and ingest today's JSW Stock Excel file.

    Returns the current :class:`JswStockStatusPublic` regardless of outcome so
    callers (cron job, ``run-now`` endpoint) always receive a meaningful response.

    Raises:
        Nothing — all exceptions are caught and recorded as ``"error"`` status.
    """
    # ── 1. Load config singleton ────────────────────────────────────────────
    cfg = await JswStockConfig.find_one({"key": "default"})

    if cfg is None or not cfg.enabled:
        logger.debug("run_poll: config absent or disabled — skipping.")
        return await get_status()

    if not cfg.base_path or not cfg.file_name:
        logger.warning(
            "run_poll: base_path=%r or file_name=%r is empty — skipping.",
            cfg.base_path,
            cfg.file_name,
        )
        return await get_status()

    # ── 2. Time-window check (LOCAL clock — BE-14) ──────────────────────────
    now = datetime.now()  # local clock — intentional (BE-14, note 1c)
    today = now.strftime("%d-%m-%Y")

    start: dt_time = _parse_hhmm(cfg.start_time)

    if now.time() < start:
        logger.debug(
            "run_poll: before window start %s (now=%s, today=%s).",
            cfg.start_time,
            now.strftime("%H:%M"),
            today,
        )
        return await get_status()

    # ── 3. Ensure dated folder exists ───────────────────────────────────────
    folder = os.path.join(cfg.base_path, today)
    os.makedirs(folder, exist_ok=True)

    # ── 4. Get or create today's ingestion record ───────────────────────────
    ingestion = await JswStockIngestion.find_one({"report_date": today})
    if ingestion is None:
        ingestion = JswStockIngestion(report_date=today, status="pending")
        await ingestion.save()

    if ingestion.status == "ingested":
        logger.debug("run_poll: already ingested for %s.", today)
        return await get_status()

    # ── 5. Check for the Excel file (case-insensitive ext — SAP may ship .XLSX) ─
    fpath = resolve_report_file(folder, cfg.file_name)

    if fpath is not None:
        # ── 5a. File found — ingest ──────────────────────────────────────────
        try:
            count = await ingest_file(fpath, today)

            found_ts = datetime.now()  # local naive — matches window clock (BE-14)
            ingestion.status = "ingested"
            ingestion.row_count = count
            ingestion.found_at = found_ts
            ingestion.file_path = fpath
            ingestion.updated_at = datetime.now()
            await ingestion.save()

            logger.info(
                "run_poll: ingested %d rows for %s from %s.", count, today, fpath
            )

        except Exception as exc:  # noqa: BLE001
            # Mark error, emit audit — do NOT re-raise (poller is top-level)
            from ...services.audit.events import audit_jsw_stock_event  # noqa: PLC0415

            ingestion.status = "error"
            ingestion.error = str(exc)
            ingestion.updated_at = datetime.now()
            await ingestion.save()

            await audit_jsw_stock_event(
                "jsw_stock.failed",
                f"Ingest failed for {today}: {exc}",
                outcome="error",
                extra={"report_date": today, "error": str(exc)},
            )
            logger.exception("run_poll: ingest_file raised for %s.", today)

    else:
        # ── 5b. File not found — alert on EVERY poll tick while missing ──────
        # Per user request: send the missing-file alert on every poll where the
        # file is absent (not just once at window end). Frequency is governed by
        # the configured interval_hours; send_missing_alert never raises
        # (transport failures are caught + logged inside it).
        await send_missing_alert(cfg, today)
        ingestion.status = "missing"
        ingestion.alerted_at = datetime.now()
        ingestion.error = f"File not found at {now.strftime('%H:%M')} on {today}"
        ingestion.updated_at = datetime.now()
        await ingestion.save()
        logger.warning(
            "run_poll: file missing at %s on %s — alert sent (every poll).",
            now.strftime("%H:%M"),
            today,
        )

    return await get_status()

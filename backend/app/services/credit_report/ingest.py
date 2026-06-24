"""Idempotent bulk ingest for a single credit report XLSX file.

Flow:
  1. Read bytes from path.
  2. Parse bytes with the raw-zip parser via parse_workbook.
  3. Delete existing docs for *report_date* + optional region provenance.
  4. Build CreditReport documents — only rows passing should_keep_row
     (non-empty customer_name AND credit_control_area in {JV0H, VJ0H, 1000}).
  5. Insert in chunks of 1 000; track count via len(chunk).
  6. Emit ``credit_report.ingested`` audit event.
  7. Return total inserted count.

No customer-code mapping: the credit report carries a native ``Customer Name``
column.  There is no party_code_normalized or customer_code_id field.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

from ...models.credit_report import CreditReport
from ...services.audit.events import audit_credit_report_event
from ...services.shared.ingest_cleanup import _row_hash, cleanup_duplicates
from ...utils.credit_report.columns import COLUMNS, coerce_value  # noqa: F401
from ...utils.credit_report.excel import parse_workbook
from ...utils.credit_report.filters import should_keep_row

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

_CHUNK_SIZE = 1000


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _now_utc() -> datetime:
    """Return the current UTC datetime."""
    return datetime.now(timezone.utc)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


async def purge_legacy_flat_rows(report_date: str | None = None) -> None:
    """Delete old credit rows that have no region provenance.

    Used during the region-zone rollout so legacy flat data does not coexist
    with the new per-region rows.
    """
    filt: dict[str, Any] = {"region_id": None}
    if report_date is not None:
        filt["report_date"] = report_date
    await CreditReport.find(filt).delete()


async def ingest_region(path: str, report_date: str, region_id: str | None) -> int:
    """Parse *path* and bulk-insert credit report rows into ``credit_report``.

    Idempotent: flat mode deletes the whole date; zoned mode deletes only the
    target ``{report_date, region_id}`` batch after clearing old no-region rows.
    Safe to re-run if a region file changes.

    Inserts in chunks of 1 000 so the BSON wire size stays bounded.

    Args:
        path:        Absolute local path to the ``.xlsx`` source file.
        report_date: Date string in ``"dd-mm-yyyy"`` format; used as the
                     idempotency key and stored on every document.

    Returns:
        Total number of rows inserted.

    Raises:
        Exception: Any I/O, parse, or database error propagates to the caller.
                   ``poller.py`` catches these and marks the ingestion as
                   ``"error"`` status.
    """
    # ── 1. Read bytes ─────────────────────────────────────────────────────────
    with open(path, "rb") as fh:
        raw_bytes = fh.read()

    # ── 2. Parse workbook ─────────────────────────────────────────────────────
    rows: list[dict[str, Any]] = parse_workbook(raw_bytes)

    # ── 3. Idempotent delete ─────────────────────────────────────────────────
    if region_id is None:
        await CreditReport.find({"report_date": report_date}).delete()
    else:
        await purge_legacy_flat_rows(report_date)
        await CreditReport.find(
            {"report_date": report_date, "region_id": region_id}
        ).delete()

    # ── 4. Build CreditReport documents (only rows passing the ingestion gate) ─
    now = _now_utc()
    docs: list[CreditReport] = []

    for row in rows:
        # Apply coerce_value for every mapped field (all 33 columns).
        coerced: dict[str, Any] = {
            field: coerce_value(field, row.get(field))
            for _, field, _ in COLUMNS
        }

        # Business-rule gate: non-empty customer_name AND CCA in
        # {JV0H, VJ0H, 1000}. should_keep_row takes ONE argument — the coerced dict.
        if not should_keep_row(coerced):
            continue

        docs.append(
            CreditReport(
                **coerced,
                region_id=region_id,
                report_date=report_date,
                source_file=path,
                row_hash=_row_hash({**coerced, "region_id": region_id}),
                created_at=now,
                updated_at=now,
            )
        )

    # ── 5. Chunked insert — track count via len(chunk), not InsertManyResult ──
    inserted = 0
    for i in range(0, len(docs), _CHUNK_SIZE):
        chunk = docs[i : i + _CHUNK_SIZE]
        await CreditReport.insert_many(chunk)
        inserted += len(chunk)

    # ── 6. Defensive same-date duplicate cleanup ──────────────────────────────
    await cleanup_duplicates(CreditReport, report_date)

    # ── 7. Audit ──────────────────────────────────────────────────────────────
    await audit_credit_report_event(
        "credit_report.ingested",
        summary=f"Ingested {inserted} rows for {report_date} from {path}",
        outcome="success",
        extra={
            "report_date": report_date,
            "row_count": inserted,
            "source_file": path,
            "region_id": region_id,
        },
    )

    # ── 8. Return count ───────────────────────────────────────────────────────
    return inserted


async def ingest_file(path: str, report_date: str) -> int:
    """Flat-mode compatibility wrapper for legacy/no-region ingestion."""
    return await ingest_region(path, report_date, region_id=None)

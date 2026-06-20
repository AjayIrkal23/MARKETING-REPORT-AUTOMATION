"""Idempotent bulk ingest for a single credit report XLSX file.

Flow:
  1. Read bytes from path.
  2. Parse bytes with the raw-zip parser via parse_workbook.
  3. Delete existing docs for *report_date* (idempotency).
  4. Build CreditReport documents — only rows passing should_keep_row
     (non-empty customer_name AND credit_control_area in {JV0H, VJ0H}).
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


async def ingest_file(path: str, report_date: str) -> int:
    """Parse *path* and bulk-insert credit report rows into ``credit_report``.

    Idempotent: deletes all existing documents whose ``report_date`` matches
    before inserting the new batch.  Safe to re-run if the file changes.

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

    # ── 3. Idempotent delete (single await is correct) ────────────────────────
    await CreditReport.find({"report_date": report_date}).delete()

    # ── 4. Build CreditReport documents (only rows passing the ingestion gate) ─
    now = _now_utc()
    docs: list[CreditReport] = []

    for row in rows:
        # Apply coerce_value for every mapped field (all 33 columns).
        coerced: dict[str, Any] = {
            field: coerce_value(field, row.get(field))
            for _, field, _ in COLUMNS
        }

        # Business-rule gate: non-empty customer_name AND CCA in {JV0H, VJ0H}.
        # should_keep_row takes ONE argument — the coerced dict.
        if not should_keep_row(coerced):
            continue

        docs.append(
            CreditReport(
                **coerced,
                report_date=report_date,
                source_file=path,
                row_hash=_row_hash(coerced),
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
        },
    )

    # ── 8. Return count ───────────────────────────────────────────────────────
    return inserted

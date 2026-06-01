"""Idempotent bulk ingest for a single JVML Stock (99).xlsx report file.

Flow:
  1. Parse bytes with the raw-zip parser (no openpyxl).
  2. Collect normalized party codes → batch CustomerCode lookup.
  3. Delete existing docs for *report_date* (idempotency).
  4. Build JvmlStock documents — ONLY rows passing should_keep_row
     (party-code match, S_HRCF, blocked==0, order-type denylist, NCO/DO rule);
     attach the resolved customer_name/customer_code_id.
  5. Insert in chunks of 1 000; track count via len(chunk).
  6. Emit ``jvml_stock.ingested`` audit event.
  7. Return total inserted count.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

from ...models.jvml_stock import JvmlStock
from ...services.audit.events import audit_jvml_stock_event
from ...utils.jvml_stock.columns import COLUMNS, coerce_value  # noqa: F401
from ...utils.jvml_stock.excel import parse_workbook
from ...utils.jvml_stock.filters import should_keep_row
from .customer_map import build_customer_map
from ...utils.report.normalize import normalize_code as _normalize_party_code

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


# `_normalize_party_code` is the shared canonical normalizer (imported above) —
# single source of truth across both pollers + the report join (AUDIT.md dedup).


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


async def ingest_file(path: str, report_date: str) -> int:
    """Parse *path*, map customer codes, and bulk-insert into ``jvml_stock``.

    Idempotent: deletes all existing documents whose ``report_date`` matches
    before inserting the new batch.  Safe to re-run if the file changes.

    Inserts in chunks of 1 000 so the BSON wire size stays bounded
    for large reports (~17 000 rows × 72 fields).

    Args:
        path:        Absolute local path to the ``.xlsx`` source file.
        report_date: Folder-date string in ``"dd-mm-yyyy"`` format; used as the
                     idempotency key and stored on every document.

    Returns:
        Total number of rows inserted.

    Raises:
        Exception: Any I/O, parse, or database error propagates to the caller.
                   ``poller.py`` catches these and marks the ingestion as
                   ``"error"`` status.
    """
    # ── 1. Read bytes and parse workbook ──────────────────────────────────────
    with open(path, "rb") as fh:
        raw_bytes = fh.read()

    rows: list[dict[str, Any]] = parse_workbook(raw_bytes)

    # ── 2. Collect normalized party codes for batch customer lookup ───────────
    normalized_codes: set[str] = set()
    for row in rows:
        # party_code arrives as raw (un-coerced) text from the parser
        raw_pc = row.get("party_code")
        # Apply text coercion to get the trimmed string first
        coerced_pc: str | None = coerce_value("party_code", raw_pc)  # type: ignore[assignment]
        pcode = _normalize_party_code(coerced_pc)
        if pcode:
            normalized_codes.add(pcode)

    customer_map = await build_customer_map(normalized_codes)

    # ── 3. Idempotent delete (single await is correct) ────────────────────────
    await JvmlStock.find({"report_date": report_date}).delete()

    # ── 4. Build JvmlStock documents (only rows passing the ingestion gate) ───
    now = _now_utc()
    docs: list[JvmlStock] = []

    for row in rows:
        # Apply coerce_value for every mapped field (all 72 columns).
        coerced: dict[str, Any] = {
            field: coerce_value(field, row.get(field))
            for _, field, _ in COLUMNS
        }

        # Compute party_code_normalized from the already-coerced party_code.
        pcode_norm = _normalize_party_code(coerced.get("party_code"))

        # Business-rule gate: party-code match, SO-Product Form == S_HRCF,
        # blocked == 0, sales-order-type denylist, NCO/DO logic. Reject otherwise.
        if not should_keep_row(coerced, pcode_norm, customer_map):
            continue

        # Gate guarantees pcode_norm is present in customer_map → attach name.
        customer_name, customer_code_id = customer_map[pcode_norm]  # type: ignore[index]

        docs.append(
            JvmlStock(
                **coerced,
                party_code_normalized=pcode_norm,
                customer_name=customer_name,
                customer_code_id=customer_code_id,
                report_date=report_date,
                source_file=path,
                created_at=now,
                updated_at=now,
            )
        )

    # ── 5. Chunked insert — track count via len(chunk), not InsertManyResult ──
    inserted = 0
    for i in range(0, len(docs), _CHUNK_SIZE):
        chunk = docs[i : i + _CHUNK_SIZE]
        await JvmlStock.insert_many(chunk)
        inserted += len(chunk)

    # ── 6. Audit ──────────────────────────────────────────────────────────────
    await audit_jvml_stock_event(
        "jvml_stock.ingested",
        summary=f"Ingested {inserted} rows for {report_date} from {path}",
        outcome="success",
        extra={
            "report_date": report_date,
            "row_count": inserted,
            "source_file": path,
        },
    )

    # ── 7. Return count ───────────────────────────────────────────────────────
    return inserted

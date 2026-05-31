"""CustomerCode service: bulk-import rows from a parsed Excel workbook.

Business rules (contract .planning/customer-codes/SPEC.md §2.5 /
ADDENDUM §Area 2, §Area 5, Builder Notes import_rows.py):

- ``region_id`` is validated via ``resolve_region_or_400`` before any rows are
  touched; an invalid or unknown region raises ``ValidationError`` (400).
- Raw ``.xlsx`` bytes are parsed by
  :func:`utils.customer_code.excel.parse_workbook`, which handles header
  normalisation, cell coercion, fully-empty-row skipping (Branch A → silent
  skip) and required-field validation (Branch B → error entry).
- Valid rows are bulk-inserted with ``CustomerCode.insert_many`` (Beanie 2.1.0).
  ``insert_many`` returns an ``InsertManyResult``; the inserted count is derived
  from ``len(docs)``, **not** the return value (ADDENDUM Area 2 §insert_many).
- Skipped-count formula (ADDENDUM Area 5 BLOCKER 3):
  ``skipped = total_rows - inserted - len(errors)``
  where ``total_rows`` = total data rows (header excluded), ``inserted`` =
  ``len(docs)``, ``len(errors)`` = rejected non-empty rows.  Applied after both
  branches; never double-counted.
- Emits ``customer_code.imported`` audit event; audit failure is swallowed
  inside ``record_audit`` and must never abort persisted records.
- Returns ``CustomerCodeImportResult`` DTO; never raw Beanie documents.
- No uniqueness constraint on ``code`` — duplicates are valid and expected.
"""

from __future__ import annotations

import io
from typing import Any

from ...models.customer_code import CustomerCode
from ...schemas.customer_code import CustomerCodeImportResult
from ...utils.customer_code.excel import parse_workbook
from ..audit.events import audit_customer_code_event
from .region_link import resolve_region_or_400


async def import_customer_codes(
    file_bytes: bytes,
    region_id: str,
    *,
    actor_email: str | None,
) -> CustomerCodeImportResult:
    """Validate region, parse workbook bytes, bulk-insert valid rows, emit audit.

    Mirrors the layering discipline of other services in this domain: all
    DB/business logic lives here; the controller only validates the upload
    and delegates.

    Args:
        file_bytes:  Raw binary content of the uploaded ``.xlsx`` file.
        region_id:   String-encoded ObjectId of the target region; validated via
                     ``resolve_region_or_400`` before any row data is touched.
        actor_email: Admin actor email threaded from ``admin.emailid``; ``None``
                     if unavailable (mirrors region ``create.py`` pattern).

    Returns:
        ``CustomerCodeImportResult`` DTO containing row counts, the resolved
        region name, and any per-row validation errors from parsing.

    Raises:
        ValidationError: If ``region_id`` is not a valid ObjectId string or
            refers to a non-existent region (same error type for both cases —
            no enumeration, ``owasp-security``).
    """
    # Step 1: Validate region BEFORE processing any row data.
    # resolve_region_or_400 raises ValidationError(400) for both invalid-hex
    # ids and valid-hex-but-missing documents (ADDENDUM Area 1 BLOCKER 4).
    region = await resolve_region_or_400(region_id)

    # Step 2: Count total data rows for the summary (header row excluded).
    # parse_workbook does not expose total_rows directly; we count cheaply
    # before parsing so the formula skipped = total_rows - inserted - errors
    # remains correct without a second full parse (ADDENDUM Area 5 BLOCKER 3).
    total_rows = _count_data_rows(file_bytes)

    # Step 3: Parse the workbook.  parse_workbook handles:
    #   • Header normalisation and column-index mapping.
    #   • DoS guard (MAX_IMPORT_ROWS) — returns a single-entry errors list.
    #   • Branch A: fully-empty rows → silently skipped (not in errors list).
    #   • Branch B: non-empty rows missing required fields → CustomerCodeImportError.
    valid_rows, errors = parse_workbook(file_bytes)

    # Step 4: Hydrate CustomerCode documents from valid parsed rows.
    # region_id is a plain str on the model (validated upstream).
    # Optional fields default to None when the key is absent from parsed dict.
    docs: list[CustomerCode] = [
        CustomerCode(
            segment=row["segment"],
            code=row["code"],
            customer=row["customer"],
            destination=row["destination"],
            cam=row.get("cam"),
            mob=row.get("mob"),
            head=row.get("head"),
            route=row.get("route"),
            ship_to=row.get("ship_to"),
            ship_to_customer=row.get("ship_to_customer"),
            region_id=region_id,
        )
        for row in valid_rows
    ]

    # Step 5: Bulk insert.
    # insert_many IS available in Beanie 2.1.0 (ADDENDUM Area 2 §insert_many).
    # Returns InsertManyResult (pymongo) — do NOT rely on the return value;
    # use len(docs) for the inserted count.
    if docs:
        await CustomerCode.insert_many(docs)
    inserted: int = len(docs)

    # Step 6: Compute skipped count.
    # skipped = rows that were fully empty (Branch A in parse_workbook).
    # Formula is valid only after both branches complete; total_rows was counted
    # in Step 2 so it reflects actual data rows regardless of DoS early-return.
    # Guard against negative values in case of edge-case row-count discrepancy.
    skipped: int = max(total_rows - inserted - len(errors), 0)

    # Step 7: Emit domain audit event.
    # category="customer_codes" — NOT "regions", NOT "customer_code" singular
    # (ADDENDUM Area 3 BLOCKER-2, Area 4 §category string asymmetry).
    # Audit failure is swallowed inside record_audit; never aborts persisted rows.
    await audit_customer_code_event(
        "customer_code.imported",
        f"Imported {inserted} rows into region '{region.name}'",
        actor_email=actor_email,
        extra=_build_audit_extra(
            region_id=region_id,
            region_name=region.name,
            total_rows=total_rows,
            inserted=inserted,
            skipped=skipped,
            error_count=len(errors),
        ),
    )

    return CustomerCodeImportResult(
        total_rows=total_rows,
        inserted=inserted,
        skipped=skipped,
        region_id=region_id,
        region_name=region.name,
        errors=errors,
    )


# ---------------------------------------------------------------------------
# Private helpers
# ---------------------------------------------------------------------------

def _count_data_rows(file_bytes: bytes) -> int:
    """Return the number of data rows in the active sheet (header excluded).

    Uses a lightweight openpyxl read (``read_only=True``, no ``data_only``)
    to count rows without loading cell values.  This is called before
    ``parse_workbook`` so ``total_rows`` is always accurate — even when
    ``parse_workbook`` returns early (e.g. DoS guard, missing headers).
    ``openpyxl`` is imported lazily, consistent with the excel-utils pattern.

    Returns 0 on any read failure so the caller's formula degrades gracefully
    (all rows appear as inserted + errors, skipped = 0).
    """
    try:
        import openpyxl  # lazy — consistent with parse_workbook / template pattern

        wb = openpyxl.load_workbook(
            io.BytesIO(file_bytes), read_only=True, data_only=False
        )
        ws = wb.active
        # iter_rows is memory-efficient in read_only mode; subtract 1 for the header.
        row_count = sum(1 for _ in ws.iter_rows()) - 1
        wb.close()
        return max(row_count, 0)
    except Exception:
        # Non-fatal: return 0 so the summary formula stays self-consistent.
        return 0


def _build_audit_extra(
    *,
    region_id: str,
    region_name: str | None,
    total_rows: int,
    inserted: int,
    skipped: int,
    error_count: int,
) -> dict[str, Any]:
    """Construct the structured ``extra`` payload for the import audit event.

    Mirrors the inline ``extra`` dict style used in ``region/create.py``;
    extracted here to keep ``import_customer_codes`` within the 250-line limit.
    """
    return {
        "region_id": region_id,
        "region_name": region_name,
        "total_rows": total_rows,
        "inserted": inserted,
        "skipped": skipped,
        "error_count": error_count,
    }

"""CustomerCode service: bulk-import rows from a parsed Excel workbook.

Business rules:

- ``region_id`` is validated via ``resolve_region_or_400`` before any rows are
  touched; an invalid or unknown region raises ``ValidationError`` (400).
- Raw ``.xlsx`` bytes are parsed by
  :func:`utils.customer_code.excel.parse_workbook`, which handles header
  normalisation, duplicate ship-to columns, cell coercion, fully-empty-row
  skipping and required-field validation.
- Valid rows are **upserted** by natural key ``(code, ship_to, region_id)``
  case-insensitively. Blank ``ship_to`` values are normalised to ``None``
  before matching. Existing documents are updated and ``updated_at`` bumped;
  missing documents are inserted.
- Rows missing a required field (``segment``, ``code``, ``customer``,
  ``destination``) are **not rejected** — the missing value is replaced with
  the string ``"unknown"`` so the row can still be imported.
- Skipped-count formula:
  ``skipped = total_rows - inserted - updated - len(errors)``
  where ``total_rows`` = total data rows (header excluded), ``inserted`` =
  new docs, ``updated`` = matched docs, ``len(errors)`` = rejected rows
  (currently only the ``MAX_IMPORT_ROWS`` overflow error).
- Emits ``customer_code.imported`` audit event; audit failure is swallowed
  inside ``record_audit`` and must never abort persisted records.
- Returns ``CustomerCodeImportResult`` DTO; never raw Beanie documents.
- No uniqueness constraint on ``code`` — duplicates across different ship-to
  rows are valid and expected.
"""

from __future__ import annotations

import io
from datetime import datetime, timezone
from typing import Any

from ...models.customer_code import CustomerCode
from ...schemas.customer_code import CustomerCodeImportResult
from ...utils.customer_code.excel import parse_workbook
from ..audit.events import audit_customer_code_event
from .region_link import resolve_region_or_400


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _norm_ship_to(v: str | None) -> str | None:
    """Normalise blank ship-to values to ``None`` for consistent matching."""
    return v.strip() if v else None


async def import_customer_codes(
    file_bytes: bytes,
    region_id: str,
    *,
    actor_email: str | None,
) -> CustomerCodeImportResult:
    """Validate region, parse workbook bytes, upsert valid rows, emit audit."""
    region = await resolve_region_or_400(region_id)

    total_rows = _count_data_rows(file_bytes)
    valid_rows, errors = parse_workbook(file_bytes)

    inserted = 0
    updated = 0

    for row in valid_rows:
        ship_to = _norm_ship_to(row.get("ship_to"))

        existing = await CustomerCode.find_one(
            {
                "code": {"$regex": f"^{_escape_regex(row['code'])}$", "$options": "i"},
                "ship_to": ship_to,
                "region_id": region_id,
            }
        )

        payload = {
            "segment": row["segment"],
            "code": row["code"],
            "customer": row["customer"],
            "destination": row["destination"],
            "cam": row.get("cam"),
            "mob": row.get("mob"),
            "head": row.get("head"),
            "route": row.get("route"),
            "ship_to": ship_to,
            "ship_to_customer": row.get("ship_to_customer"),
            "ship_to_city": row.get("ship_to_city"),
            "rake": row.get("rake"),
            "transport_mode": row.get("transport_mode"),
            "region_id": region_id,
        }

        if existing is not None:
            for key, value in payload.items():
                setattr(existing, key, value)
            existing.updated_at = _now_utc()
            await existing.save()
            updated += 1
        else:
            doc = CustomerCode(
                **payload,  # type: ignore[arg-type]
                created_at=_now_utc(),
                updated_at=_now_utc(),
            )
            await doc.insert()
            inserted += 1

    skipped: int = max(total_rows - inserted - updated - len(errors), 0)

    await audit_customer_code_event(
        "customer_code.imported",
        f"Imported {inserted} and updated {updated} rows in region '{region.name}'",
        actor_email=actor_email,
        extra=_build_audit_extra(
            region_id=region_id,
            region_name=region.name,
            total_rows=total_rows,
            inserted=inserted,
            updated=updated,
            skipped=skipped,
            error_count=len(errors),
        ),
    )

    return CustomerCodeImportResult(
        total_rows=total_rows,
        inserted=inserted,
        updated=updated,
        skipped=skipped,
        region_id=region_id,
        region_name=region.name,
        errors=errors,
    )


def _escape_regex(s: str) -> str:
    """Escape a string for safe inclusion in a regex anchor."""
    return __import__("re").escape(s)


def _count_data_rows(file_bytes: bytes) -> int:
    """Return the number of data rows in the active sheet (header excluded)."""
    try:
        import openpyxl

        wb = openpyxl.load_workbook(
            io.BytesIO(file_bytes), read_only=True, data_only=False
        )
        ws = wb.active
        row_count = sum(1 for _ in ws.iter_rows()) - 1
        wb.close()
        return max(row_count, 0)
    except Exception:
        return 0


def _build_audit_extra(
    *,
    region_id: str,
    region_name: str | None,
    total_rows: int,
    inserted: int,
    updated: int,
    skipped: int,
    error_count: int,
) -> dict[str, Any]:
    return {
        "region_id": region_id,
        "region_name": region_name,
        "total_rows": total_rows,
        "inserted": inserted,
        "updated": updated,
        "skipped": skipped,
        "error_count": error_count,
    }

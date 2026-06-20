"""Excel import and template utilities for the customer_code domain.

``openpyxl`` is imported **lazily inside each function** so ``import app.main``
works without the package installed.  Real-file quirks handled: ``code`` as int,
``MOB No.`` as int or free-text, ``CAM `` trailing space, unnamed junk columns
(None-header guard), duplicate ``SHIP TO`` / ``SHIP TO CUSTOMER`` columns, and
numeric cells coerced to strings.
"""

from __future__ import annotations

import re

from ...schemas.customer_code import CustomerCodeImportError


# ---------------------------------------------------------------------------
# Header normalisation
# ---------------------------------------------------------------------------

def normalize_header(h: object) -> str:
    """Collapse whitespace runs to a single space, strip, and lower-case.

    Ensures ``"CAM "`` → ``"cam"``, ``"MOB No."`` → ``"mob no."`` etc.
    """
    return re.sub(r"\s+", " ", str(h)).strip().lower()


# ---------------------------------------------------------------------------
# Column → field map
# ---------------------------------------------------------------------------

#: Maps *normalised* Excel header strings to CustomerCode model field names.
#: Three ``mob`` aliases handle period-dropped exports and bare ``"mob"``.
#: Duplicate ``ship to`` / ``ship to customer`` columns are resolved by
#: occurrence order in ``_header_to_field`` below.
_HEADER_MAP: dict[str, str] = {
    "segment":          "segment",
    "code":             "code",
    "customer":         "customer",
    "destination":      "destination",
    "cam":              "cam",            # 'CAM ' → 'cam' via normalize_header
    "mob no.":          "mob",            # 'MOB No.' → 'mob no.'
    "mob no":           "mob",            # alias: period dropped by some exports
    "mob":              "mob",            # bare alias
    "head":             "head",
    "route":            "route",
    "ship to":          "ship_to",
    "ship to customer": "ship_to_customer",
    "ship to city":     "ship_to_city",
    "rake":             "rake",
    "transport mode":   "transport_mode",
}

#: Required model fields — a non-empty row missing any of these is an error.
REQUIRED_FIELDS: tuple[str, ...] = ("segment", "code", "customer", "destination")

#: Maximum data rows accepted per import sheet (DoS guard).
MAX_IMPORT_ROWS: int = 50_000


# ---------------------------------------------------------------------------
# Header resolution with duplicate handling
# ---------------------------------------------------------------------------

def _header_to_field(header_row: tuple[object, ...]) -> dict[int, str]:
    """Build a column-index → field-name map from the header row.

    Duplicate ``ship to`` / ``ship to customer`` headers are mapped by
    occurrence: first pair → ``ship_to`` / ``ship_to_customer``, second pair
    → ``ship_to_2`` / ``ship_to_customer_2``. Unnamed / unknown headers are
    ignored so their stray values do not pollute parsed rows.
    """
    seen: dict[str, int] = {}
    col_field_map: dict[int, str] = {}
    for col_idx, h in enumerate(header_row):
        if h is None:
            continue
        norm = normalize_header(h)
        field = _HEADER_MAP.get(norm)
        if not field:
            continue
        # Resolve duplicate ship-to headers by occurrence.
        if norm == "ship to":
            seen["ship to"] = seen.get("ship to", 0) + 1
            field = "ship_to" if seen["ship to"] == 1 else "ship_to_2"
        elif norm == "ship to customer":
            seen["ship to customer"] = seen.get("ship to customer", 0) + 1
            field = "ship_to_customer" if seen["ship to customer"] == 1 else "ship_to_customer_2"
        col_field_map[col_idx] = field
    return col_field_map


# ---------------------------------------------------------------------------
# Cell coercion
# ---------------------------------------------------------------------------

def cell_to_str(v: object) -> str | None:
    """Coerce a raw openpyxl cell value to a clean string or ``None``.

    - ``None`` → ``None``
    - ``float`` with no fractional part (e.g. ``40020365.0``) → ``"40020365"``
    - ``float`` with fractional part → ``str(v)``
    - ``int`` / ``str`` / other → ``str(v).strip()``; empty string → ``None``

    The ``float`` branch handles SAP codes stored as numeric xlsx cells
    (openpyxl reads them as ``float`` in ``data_only`` mode).
    """
    if v is None:
        return None
    if isinstance(v, float):
        return str(int(v)) if v.is_integer() else str(v)
    s = str(v).strip()
    return s if s else None


# ---------------------------------------------------------------------------
# Workbook parser
# ---------------------------------------------------------------------------

def parse_workbook(
    file_bytes: bytes,
) -> tuple[list[dict[str, str | None]], list[CustomerCodeImportError]]:
    """Parse binary ``.xlsx`` bytes and return ``(valid_rows, errors)``.

    Each element of ``valid_rows`` is a ``dict`` of model field → cleaned
    string (or ``None`` for optional fields).  Fully-empty rows are silently
    skipped (counted as *skipped*, not as errors in the import summary).
    Non-empty rows missing a required field have that field filled with the
    string ``"unknown"`` instead of being rejected.

    Early-return paths: (1) no rows → ``([], [])``;
    (2) required headers absent → ``([], [error])``;
    (3) exceeds ``MAX_IMPORT_ROWS`` → ``([], [error])``.
    Excel row numbers: header = 1, first data row = 2.
    Rows buffered before ``wb.close()`` — openpyxl read-only mode
    releases file handles on close.
    """
    import io

    import openpyxl  # lazy — app.main works without openpyxl installed

    wb = openpyxl.load_workbook(
        io.BytesIO(file_bytes),
        read_only=True,
        data_only=True,
    )
    ws = wb.active
    rows = list(ws.iter_rows(values_only=True))  # buffer before close
    wb.close()  # required: releases file handles held by read_only mode

    if not rows:
        return [], []

    # Build column-index → field-name map from the header row.
    col_field_map = _header_to_field(rows[0])

    # Validate that all required headers are present.
    mapped_fields = set(col_field_map.values())
    missing_headers = [f for f in REQUIRED_FIELDS if f not in mapped_fields]
    if missing_headers:
        return [], [
            CustomerCodeImportError(
                row=0,
                message=(
                    f"Missing required column(s): {', '.join(missing_headers)}. "
                    "Ensure the file uses the official template headers."
                ),
            )
        ]

    # DoS guard — reject sheets that exceed MAX_IMPORT_ROWS.
    data_rows = rows[1:]
    if len(data_rows) > MAX_IMPORT_ROWS:
        return [], [
            CustomerCodeImportError(
                row=0,
                message=(
                    f"Sheet exceeds {MAX_IMPORT_ROWS:,} row limit "
                    f"({len(data_rows):,} rows found). Split the file."
                ),
            )
        ]

    valid_rows: list[dict[str, str | None]] = []
    errors: list[CustomerCodeImportError] = []

    for row_idx, raw_row in enumerate(data_rows, start=2):
        # Map each tracked column index to its coerced string value.
        parsed: dict[str, str | None] = {
            field: cell_to_str(raw_row[col_i] if col_i < len(raw_row) else None)
            for col_i, field in col_field_map.items()
        }

        # Branch A: all mapped fields are None → fully-empty row, skip silently.
        # These contribute to the *skipped* count, not the error count.
        if all(v is None for v in parsed.values()):
            continue

        # Branch B: non-empty row missing a required field → fill with "unknown"
        # rather than rejecting the row. The user explicitly wants every row kept.
        for field in REQUIRED_FIELDS:
            if not parsed.get(field):
                parsed[field] = "unknown"

        valid_rows.append(parsed)

    return valid_rows, errors


# ---------------------------------------------------------------------------
# Template builder
# ---------------------------------------------------------------------------

#: Canonical column order for the downloadable import template.
#: Written without the trailing space on "CAM"; normalize_header handles
#: the equivalence on re-import.
TEMPLATE_HEADERS: list[str] = [
    "Segment", "code", "Customer", "Destination",
    "CAM", "MOB No.", "Head", "ROUTE",
    "SHIP TO", "SHIP TO CUSTOMER",
    "SHIP TO", "SHIP TO CUSTOMER",
    "SHIP TO CITY", "RAKE", "TRANSPORT MODE",
]

_TEMPLATE_EXAMPLE_ROW: list[str] = [
    "Retail", "40020365", "Example Steel Traders", "Mumbai",
    "Ravi Kumar", "9876543210", "Sales Head Name", "KAT036",
    "40047421", "Example Ship-To Pvt Ltd",
    "40047422", "Example Second Ship-To Pvt Ltd",
    "Mumbai", "RAKE-01", "RAKE",
]


def build_template_workbook() -> bytes:
    """Build a minimal import template and return raw ``.xlsx`` bytes.

    The workbook contains one sheet (``"Customer Codes"``) with the canonical
    header row and one example data row illustrating expected value formats.
    Headers are bold with a light-blue fill for readability; columns are
    auto-sized to the widest of header or example value.

    Returns raw bytes suitable for ``StreamingResponse`` with content-type
    ``application/vnd.openxmlformats-officedocument.spreadsheetml.sheet``.

    ``openpyxl`` is imported lazily so app startup does not require it.
    """
    import io

    import openpyxl  # lazy — app.main works without openpyxl installed
    from openpyxl.styles import Font, PatternFill

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Customer Codes"

    header_fill = PatternFill(start_color="D9E1F2", end_color="D9E1F2", fill_type="solid")
    header_font = Font(bold=True)
    ws.append(TEMPLATE_HEADERS)
    for cell in ws[1]:
        cell.font = header_font
        cell.fill = header_fill

    ws.append(_TEMPLATE_EXAMPLE_ROW)

    # Auto-size columns to the widest of header or example value.
    for col_idx, col_cells in enumerate(ws.columns, start=1):
        max_len = max(
            len(str(cell.value)) if cell.value is not None else 0
            for cell in col_cells
        )
        ws.column_dimensions[
            openpyxl.utils.get_column_letter(col_idx)
        ].width = max_len + 4

    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()

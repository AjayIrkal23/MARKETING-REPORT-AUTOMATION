# app/utils/credit_report/columns.py
"""
Column map for credit report.XLSX  (33 columns).

Single source of truth. Used by:
  - excel.py  (HEADER_TO_FIELD for header→field mapping)
  - ingest.py (coerce_value for type coercion)
  - models/credit_report.py (field list reference)
  - schemas/credit_report.py (filter/sort field validation)

Type tags:
  text   → trimmed str | None  (int-valued floats rendered without ".0";
                                 non-floatable strings kept verbatim)
  number → float | None
  date   → datetime | None     (Excel serial OR dd.mm.yyyy OR ISO text)
"""

from __future__ import annotations

import re
from datetime import datetime, timedelta
from typing import Union

# ---------------------------------------------------------------------------
# Master column list — (excel_header, field_name, type_tag)
# Order matches source workbook column order (1-based).
# ---------------------------------------------------------------------------
COLUMNS: list[tuple[str, str, str]] = [
    ("Customer Name",              "customer_name",              "text"),
    ("City",                       "city",                       "text"),
    ("Customer",                   "customer",                   "text"),
    ("Credit control area",        "credit_control_area",        "text"),
    ("CCA Description",            "cca_description",            "text"),
    ("Blocked",                    "blocked",                    "text"),
    ("Currency",                   "currency",                   "text"),
    ("CCA Credit Limit",          "cca_credit_limit",           "number"),
    ("Credit Proposal number",     "credit_proposal_number",     "text"),
    ("Proposed Value",            "proposed_value",             "number"),
    ("Credit Exposure",           "credit_exposure",            "number"),
    ("Credit Balance",            "credit_balance",             "number"),
    ("Overdue",                    "overdue",                    "number"),
    ("Sales value",               "sales_value",                "number"),
    ("Total receivables",         "total_receivables",          "number"),
    ("Special liabilities",       "special_liabilities",        "number"),
    ("Open delivery credit",       "open_delivery_credit",       "number"),
    ("Open bill.doc.credit",       "open_bill_doc_credit",       "number"),
    ("Open orders credit",         "open_orders_credit",         "number"),
    ("Guaranteed open delivery",   "guaranteed_open_delivery",   "number"),
    ("Guarantd open billing docs", "guarantd_open_billing_docs", "number"),
    ("Guaranteed open orders",     "guaranteed_open_orders",     "number"),
    ("Validity Per. Start",        "validity_period_start",      "date"),
    ("Validity Period End",        "validity_period_end",        "date"),
    ("Risk category",             "risk_category",              "text"),
    ("Total amount",              "total_amount",               "number"),
    ("Individual limit",          "individual_limit",           "number"),
    ("Sales Organization",        "sales_organization",         "text"),
    ("Distribution Channel",      "distribution_channel",       "text"),
    ("Division",                   "division",                   "text"),
    ("Sales Group",               "sales_group",                "text"),
    ("Sales Office",              "sales_office",               "text"),
    ("Hierarchy Customer",        "hierarchy_customer",         "text"),
]

assert len(COLUMNS) == 33, f"Expected 33 columns, got {len(COLUMNS)}"

# ---------------------------------------------------------------------------
# Derived lookup structures (computed once at import time)
# ---------------------------------------------------------------------------

def normalize_header(h: str) -> str:
    """Collapse internal whitespace, strip, lowercase."""
    return re.sub(r"\s+", " ", h).strip().lower()


# Normalized header string → field name.
# Callers: excel.py row 1 header scan.
HEADER_TO_FIELD: dict[str, str] = {
    normalize_header(excel_header): field
    for excel_header, field, _ in COLUMNS
}

# Field name → type tag.
FIELD_TYPES: dict[str, str] = {
    field: type_tag
    for _, field, type_tag in COLUMNS
}

TEXT_FIELDS: tuple[str, ...] = tuple(
    field for _, field, t in COLUMNS if t == "text"
)
NUMBER_FIELDS: tuple[str, ...] = tuple(
    field for _, field, t in COLUMNS if t == "number"
)
DATE_FIELDS: tuple[str, ...] = tuple(
    field for _, field, t in COLUMNS if t == "date"
)

# ---------------------------------------------------------------------------
# Excel serial date helper
# ---------------------------------------------------------------------------
_EXCEL_EPOCH = datetime(1899, 12, 30)


def excel_serial_to_datetime(serial: float) -> datetime:
    """Convert an Excel date serial (days since 1899-12-30) to datetime."""
    return _EXCEL_EPOCH + timedelta(days=float(serial))


# ---------------------------------------------------------------------------
# Value coercion
# ---------------------------------------------------------------------------

def coerce_value(
    field: str,
    raw: object,
) -> Union[str, float, datetime, None]:
    """
    Apply the type rule for *field* to the raw cell value from parse_workbook.

    text:
        None/empty → None
        float with .is_integer() → str(int(v))   e.g. 400137058.0 → "400137058"
        other float → str(v)
        str → v.strip() or None

    number:
        parseable as float → float(raw)
        else → None

    date:
        int/float → excel_serial_to_datetime(raw)
        str → try "%d.%m.%Y", then fromisoformat (strips trailing Z)
        else → None
    """
    type_tag = FIELD_TYPES.get(field, "text")

    if type_tag == "text":
        if raw is None:
            return None
        if isinstance(raw, float):
            if raw != raw:          # NaN guard
                return None
            return str(int(raw)) if raw.is_integer() else str(raw)
        if isinstance(raw, int):
            return str(raw)
        s = str(raw).strip()
        return s if s else None

    if type_tag == "number":
        if raw is None:
            return None
        try:
            return float(raw)
        except (TypeError, ValueError):
            return None

    # date
    if raw is None:
        return None

    dt: datetime | None = None
    if isinstance(raw, (int, float)):
        try:
            dt = excel_serial_to_datetime(raw)
        except (OverflowError, ValueError, OSError):
            return None
    elif isinstance(raw, str):
        s = raw.strip()
        if not s:
            return None
        try:
            dt = datetime.strptime(s, "%d.%m.%Y")
        except ValueError:
            pass
        if dt is None:
            try:
                dt = datetime.fromisoformat(s.rstrip("Z"))
            except ValueError:
                return None
    if dt is None:
        return None

    # Drop open-ended / sentinel dates such as 9999-12-31.  They are valid
    # Python datetimes but break downstream `.astimezone()` conversions on
    # some platforms, and the credit-report UI does not use these columns.
    if dt.year >= 9999:
        return None

    return dt

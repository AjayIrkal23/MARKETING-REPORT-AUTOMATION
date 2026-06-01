# app/utils/jvml_stock/columns.py
"""
Column map for JVML Stock (99).xlsx  (72 columns).

Single source of truth. Used by:
  - excel.py  (HEADER_TO_FIELD for header→field mapping)
  - ingest.py (coerce_value for type coercion)
  - models/jvml_stock.py (field list reference)
  - schemas/jvml_stock.py (filter/sort field validation)

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
    ("SO Sales Org",               "so_sales_org",               "text"),
    ("Sales Order Type",           "sales_order_type",           "text"),
    ("Distr.Chnl",                 "distr_chnl",                 "text"),
    ("Sold To Party",              "sold_to_party",              "text"),
    ("Party Code",                 "party_code",                 "text"),
    ("Ship To Party",              "ship_to_party",              "text"),
    ("Customer",                   "customer",                   "text"),
    ("Material",                   "material",                   "text"),
    ("Sales Office",               "sales_office",               "text"),
    ("SO-Product Form",            "so_product_form",            "text"),
    ("JSW Grade",                  "jsw_grade",                  "text"),
    ("Act.Thickness (mm)",         "act_thickness_mm",           "text"),
    ("Width (mm)",                 "width_mm",                   "text"),
    ("Batch",                      "batch",                      "text"),
    ("Unrestr.Qty.",               "unrestr_qty",                "number"),
    ("In Quality Insp.",           "in_quality_insp",            "number"),
    ("Blocked",                    "blocked",                    "number"),
    ("Stock Quantity",             "stock_quantity",             "number"),
    ("Usage Decision",             "usage_decision",             "text"),
    ("NCO Declared",               "nco_declared",               "text"),
    ("Next Workcenter",            "next_workcenter",            "text"),
    ("Length(mm)",                 "length_mm",                  "text"),
    ("NCO Reason",                 "nco_reason",                 "text"),
    ("UD Remarks",                 "ud_remarks",                 "text"),
    ("Aging",                      "aging",                      "number"),
    ("Production Date",            "production_date",            "date"),
    ("Shift",                      "shift",                      "text"),
    ("Sales Order No",             "sales_order_no",             "text"),
    ("SO Item Num",                "so_item_num",                "text"),
    ("Order Status",               "order_status",               "text"),
    ("Location",                   "location",                   "text"),
    ("STR No",                     "str_no",                     "text"),
    ("STO No",                     "sto_no",                     "text"),
    ("DO No",                      "do_no",                      "text"),
    ("Shipment",                   "shipment",                   "text"),
    ("Storage Location",           "storage_location",           "text"),
    ("Port Name",                  "port_name",                  "text"),
    ("UNLOADING POINT",            "unloading_point",            "text"),
    ("RECIEVING POINT",            "recieving_point",            "text"),
    ("Purchase Order Number",      "purchase_order_number",      "text"),
    ("Scheduled Status",           "scheduled_status",           "text"),
    ("Eq. Specification",          "eq_specification",           "text"),
    ("Eq. Sub Grade",              "eq_sub_grade",               "text"),
    ("SO-End Application",         "so_end_application",         "text"),
    ("production workcenter",      "production_workcenter",      "text"),
    ("YS in MPa",                  "ys_in_mpa",                  "number"),
    ("ELONGATION",                 "elongation",                 "text"),
    ("Elongation(Mic)",            "elongation_mic",             "number"),
    ("HARDNESS",                   "hardness",                   "text"),
    ("S_ALUMINIUM_PCT",            "s_aluminium_pct",            "number"),
    ("S_BORON_PCT",                "s_boron_pct",                "number"),
    ("S_CARBON_PCT",               "s_carbon_pct",               "number"),
    ("S_CHROMIUM_PCT",             "s_chromium_pct",             "number"),
    ("S_COPPER_PCT",               "s_copper_pct",               "number"),
    ("S_MANGANESE_PCT",            "s_manganese_pct",            "number"),
    ("S_MOLYBDENUM_PCT",           "s_molybdenum_pct",           "number"),
    ("S_NICKEL_PCT",               "s_nickel_pct",               "number"),
    ("S_NIOBIUM_PCT",              "s_niobium_pct",              "number"),
    ("S_PHOSPHORUS_PCT",           "s_phosphorus_pct",           "number"),
    ("S_SILICON_PCT",              "s_silicon_pct",              "number"),
    ("S_SULPHUR_PCT",              "s_sulphur_pct",              "number"),
    ("S_TITANIUM_PCT",             "s_titanium_pct",             "number"),
    ("S_VANADIUM_PCT",             "s_vanadium_pct",             "number"),
    ("Tensile Strength MPa (B)",   "tensile_strength_mpa_b",     "number"),
    ("YIELD STRENGTH",             "yield_strength",             "text"),
    ("UTS",                        "uts",                        "text"),
    ("Special Stock",              "special_stock",              "text"),
    ("CP Number",                  "cp_number",                  "text"),
    ("CP End Date",                "cp_end_date",                "date"),
    ("LC Exp Date",                "lc_exp_date",                "text"),
    ("Route",                      "route",                      "text"),
    ("Route Desc",                 "route_desc",                 "text"),
]

assert len(COLUMNS) == 72, f"Expected 72 columns, got {len(COLUMNS)}"

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
    if isinstance(raw, (int, float)):
        try:
            return excel_serial_to_datetime(raw)
        except Exception:
            return None
    if isinstance(raw, str):
        s = raw.strip()
        if not s:
            return None
        try:
            return datetime.strptime(s, "%d.%m.%Y")
        except ValueError:
            pass
        try:
            return datetime.fromisoformat(s.rstrip("Z"))
        except ValueError:
            return None
    return None

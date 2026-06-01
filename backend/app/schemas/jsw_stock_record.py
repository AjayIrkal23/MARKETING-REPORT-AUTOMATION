"""JSW Stock public record DTO — used for both list rows and the detail sheet.

JswStockPublic carries all 72 Excel columns + 7 mapping/meta fields.
Type mapping per SPEC §1:
  text   -> str | None
  number -> float | None
  date   -> datetime | None   (except lc_exp_date — str | None per ADDENDUM BE-1)

Field order matches SPEC §1 column order (1-based) then meta fields.
"""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel


class JswStockPublic(BaseModel):
    """Public representation of a JswStock document (list row + detail sheet)."""

    id: str

    # -------------------------------------------------------------------------
    # Excel columns 1–72 (SPEC §1 order)
    # -------------------------------------------------------------------------

    # col 1 — text
    so_sales_org: str | None = None
    # col 2 — text
    sales_order_type: str | None = None
    # col 3 — text
    distr_chnl: str | None = None
    # col 4 — text
    sold_to_party: str | None = None
    # col 5 — text
    party_code: str | None = None
    # col 6 — text
    ship_to_party: str | None = None
    # col 7 — text
    customer: str | None = None
    # col 8 — text
    material: str | None = None
    # col 9 — text
    sales_office: str | None = None
    # col 10 — text
    so_product_form: str | None = None
    # col 11 — text
    jsw_grade: str | None = None
    # col 12 — text (stored as text per ADDENDUM BE-2)
    act_thickness_mm: str | None = None
    # col 13 — text (stored as text per ADDENDUM BE-2)
    width_mm: str | None = None
    # col 14 — text
    batch: str | None = None
    # col 15 — number
    unrestr_qty: float | None = None
    # col 16 — number
    in_quality_insp: float | None = None
    # col 17 — number
    blocked: float | None = None
    # col 18 — number
    stock_quantity: float | None = None
    # col 19 — text
    usage_decision: str | None = None
    # col 20 — text
    nco_declared: str | None = None
    # col 21 — text
    next_workcenter: str | None = None
    # col 22 — text (stored as text per ADDENDUM BE-2)
    length_mm: str | None = None
    # col 23 — text
    nco_reason: str | None = None
    # col 24 — text
    ud_remarks: str | None = None
    # col 25 — number
    aging: float | None = None
    # col 26 — date
    production_date: datetime | None = None
    # col 27 — text
    shift: str | None = None
    # col 28 — text
    sales_order_no: str | None = None
    # col 29 — text
    so_item_num: str | None = None
    # col 30 — text
    order_status: str | None = None
    # col 31 — text
    location: str | None = None
    # col 32 — text
    str_no: str | None = None
    # col 33 — text
    sto_no: str | None = None
    # col 34 — text
    do_no: str | None = None
    # col 35 — text
    shipment: str | None = None
    # col 36 — text
    storage_location: str | None = None
    # col 37 — text
    port_name: str | None = None
    # col 38 — text
    unloading_point: str | None = None
    # col 39 — text (sic spelling per ADDENDUM BE-3)
    recieving_point: str | None = None
    # col 40 — text
    purchase_order_number: str | None = None
    # col 41 — text
    scheduled_status: str | None = None
    # col 42 — text
    eq_specification: str | None = None
    # col 43 — text
    eq_sub_grade: str | None = None
    # col 44 — text
    so_end_application: str | None = None
    # col 45 — text
    production_workcenter: str | None = None
    # col 46 — number
    ys_in_mpa: float | None = None
    # col 47 — text (stored as text per ADDENDUM BE-2)
    elongation: str | None = None
    # col 48 — number
    elongation_mic: float | None = None
    # col 49 — text (stored as text per ADDENDUM BE-2)
    hardness: str | None = None
    # col 50 — number
    s_aluminium_pct: float | None = None
    # col 51 — number
    s_boron_pct: float | None = None
    # col 52 — number
    s_carbon_pct: float | None = None
    # col 53 — number
    s_chromium_pct: float | None = None
    # col 54 — number
    s_copper_pct: float | None = None
    # col 55 — number
    s_manganese_pct: float | None = None
    # col 56 — number
    s_molybdenum_pct: float | None = None
    # col 57 — number
    s_nickel_pct: float | None = None
    # col 58 — number
    s_niobium_pct: float | None = None
    # col 59 — number
    s_phosphorus_pct: float | None = None
    # col 60 — number
    s_silicon_pct: float | None = None
    # col 61 — number
    s_sulphur_pct: float | None = None
    # col 62 — number
    s_titanium_pct: float | None = None
    # col 63 — number
    s_vanadium_pct: float | None = None
    # col 64 — number
    tensile_strength_mpa_b: float | None = None
    # col 65 — text (stored as text per ADDENDUM BE-2)
    yield_strength: str | None = None
    # col 66 — text (stored as text per ADDENDUM BE-2)
    uts: str | None = None
    # col 67 — text
    special_stock: str | None = None
    # col 68 — text
    cp_number: str | None = None
    # col 69 — date
    cp_end_date: datetime | None = None
    # col 70 — text (verbatim dd.mm.yyyy string per ADDENDUM BE-1, NOT datetime)
    lc_exp_date: str | None = None
    # col 71 — text
    route: str | None = None
    # col 72 — text
    route_desc: str | None = None

    # -------------------------------------------------------------------------
    # Mapping + meta fields (SPEC §1 meta table)
    # -------------------------------------------------------------------------

    party_code_normalized: str | None = None
    customer_name: str | None = None
    customer_code_id: str | None = None
    report_date: str
    source_file: str | None = None
    created_at: datetime
    updated_at: datetime

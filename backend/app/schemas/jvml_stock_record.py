"""JVML Stock public record DTO — used for both list rows and the detail sheet.

JvmlStockPublic carries all 72 Excel columns + 7 mapping/meta fields.
Type mapping per SPEC §1:
  text   -> str | None
  number -> float | None
  date   -> datetime | None   (except lc_exp_date — str | None per ADDENDUM BE-1)

Field order matches SPEC §1 column order (1-based) then meta fields.
"""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel


class JvmlStockPublic(BaseModel):
    """Public representation of a JvmlStock document (list row + detail sheet)."""

    id: str

    # --- §1 72 data columns ---
    so_sales_org: str | None = None
    sales_order_type: str | None = None
    distr_chnl: str | None = None
    sold_to_party: str | None = None
    party_code: str | None = None
    ship_to_party: str | None = None
    customer: str | None = None
    material: str | None = None
    sales_office: str | None = None
    so_product_form: str | None = None
    jsw_grade: str | None = None
    act_thickness_mm: str | None = None
    width_mm: str | None = None
    batch: str | None = None
    unrestr_qty: float | None = None
    in_quality_insp: float | None = None
    blocked: float | None = None
    stock_quantity: float | None = None
    usage_decision: str | None = None
    nco_declared: str | None = None
    next_workcenter: str | None = None
    length_mm: str | None = None
    nco_reason: str | None = None
    ud_remarks: str | None = None
    aging: float | None = None
    production_date: datetime | None = None
    shift: str | None = None
    sales_order_no: str | None = None
    so_item_num: str | None = None
    order_status: str | None = None
    location: str | None = None
    str_no: str | None = None
    sto_no: str | None = None
    do_no: str | None = None
    shipment: str | None = None
    storage_location: str | None = None
    port_name: str | None = None
    unloading_point: str | None = None
    recieving_point: str | None = None           # original Excel spelling preserved
    purchase_order_number: str | None = None
    scheduled_status: str | None = None
    eq_specification: str | None = None
    eq_sub_grade: str | None = None
    so_end_application: str | None = None
    production_workcenter: str | None = None
    ys_in_mpa: float | None = None
    elongation: str | None = None
    elongation_mic: float | None = None
    hardness: str | None = None
    s_aluminium_pct: float | None = None
    s_boron_pct: float | None = None
    s_carbon_pct: float | None = None
    s_chromium_pct: float | None = None
    s_copper_pct: float | None = None
    s_manganese_pct: float | None = None
    s_molybdenum_pct: float | None = None
    s_nickel_pct: float | None = None
    s_niobium_pct: float | None = None
    s_phosphorus_pct: float | None = None
    s_silicon_pct: float | None = None
    s_sulphur_pct: float | None = None
    s_titanium_pct: float | None = None
    s_vanadium_pct: float | None = None
    tensile_strength_mpa_b: float | None = None
    yield_strength: str | None = None
    uts: str | None = None
    special_stock: str | None = None
    cp_number: str | None = None
    cp_end_date: datetime | None = None
    lc_exp_date: str | None = None               # text (dd.mm.yyyy verbatim)
    route: str | None = None
    route_desc: str | None = None

    # --- 7 meta/mapping fields ---
    party_code_normalized: str | None = None
    customer_name: str | None = None
    customer_code_id: str | None = None
    report_date: str                              # dd-mm-yyyy, always set
    source_file: str | None = None
    created_at: datetime
    updated_at: datetime

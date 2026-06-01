"""JswStock document model (MongoDB collection ``jsw_stock``, via Beanie)."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Annotated

from beanie import Document, Indexed
from pydantic import Field


def _now_utc() -> datetime:
    """Return the current UTC datetime (used as a :func:`~pydantic.Field` default factory)."""
    return datetime.now(timezone.utc)


class JswStock(Document):
    """One row from the ZSD_CURRSTK_HR stock Excel report.

    72 source columns (SPEC §1) + 7 mapping/meta fields. Bulk-replaced per
    report_date on each ingestion run. 17 Indexed() fields power filters.
    """

    # ── 12 filter fields (Indexed) ────────────────────────────────────────────
    so_sales_org:     Annotated[str | None, Indexed()] = None
    sales_order_type: Annotated[str | None, Indexed()] = None
    distr_chnl:       Annotated[str | None, Indexed()] = None
    sold_to_party:    Annotated[str | None, Indexed()] = None
    party_code:       Annotated[str | None, Indexed()] = None
    ship_to_party:    Annotated[str | None, Indexed()] = None
    customer:         Annotated[str | None, Indexed()] = None
    material:         Annotated[str | None, Indexed()] = None
    sales_office:     Annotated[str | None, Indexed()] = None
    so_product_form:  Annotated[str | None, Indexed()] = None
    jsw_grade:        Annotated[str | None, Indexed()] = None
    nco_declared:     Annotated[str | None, Indexed()] = None

    # ── remaining 60 source fields (non-indexed) ──────────────────────────────
    act_thickness_mm:       str | None = None   # text — BE-2
    width_mm:               str | None = None   # text — BE-2
    batch:                  str | None = None
    unrestr_qty:            float | None = None
    in_quality_insp:        float | None = None
    blocked:                float | None = None
    stock_quantity:         float | None = None
    usage_decision:         str | None = None
    next_workcenter:        str | None = None
    length_mm:              str | None = None   # text — BE-2
    nco_reason:             str | None = None
    ud_remarks:             str | None = None
    aging:                  float | None = None
    production_date:        datetime | None = None
    shift:                  str | None = None
    sales_order_no:         str | None = None
    so_item_num:            str | None = None
    order_status:           str | None = None
    location:               str | None = None
    str_no:                 str | None = None
    sto_no:                 str | None = None
    do_no:                  str | None = None
    shipment:               str | None = None
    storage_location:       str | None = None
    port_name:              str | None = None
    unloading_point:        str | None = None
    recieving_point:        str | None = None   # sic — mirrors Excel header exactly (BE-3)
    purchase_order_number:  str | None = None
    scheduled_status:       str | None = None
    eq_specification:       str | None = None
    eq_sub_grade:           str | None = None
    so_end_application:     str | None = None
    production_workcenter:  str | None = None
    ys_in_mpa:              float | None = None
    elongation:             str | None = None   # text — BE-2
    elongation_mic:         float | None = None
    hardness:               str | None = None   # text — BE-2
    s_aluminium_pct:        float | None = None
    s_boron_pct:            float | None = None
    s_carbon_pct:           float | None = None
    s_chromium_pct:         float | None = None
    s_copper_pct:           float | None = None
    s_manganese_pct:        float | None = None
    s_molybdenum_pct:       float | None = None
    s_nickel_pct:           float | None = None
    s_niobium_pct:          float | None = None
    s_phosphorus_pct:       float | None = None
    s_silicon_pct:          float | None = None
    s_sulphur_pct:          float | None = None
    s_titanium_pct:         float | None = None
    s_vanadium_pct:         float | None = None
    tensile_strength_mpa_b: float | None = None  # malformed cells (BE-6) coerced to None
    yield_strength:         str | None = None    # text — BE-2
    uts:                    str | None = None    # text — BE-2
    special_stock:          str | None = None
    cp_number:              str | None = None
    cp_end_date:            datetime | None = None
    lc_exp_date:            str | None = None   # text — verbatim dd.mm.yyyy (BE-1)
    route:                  str | None = None
    route_desc:             str | None = None

    # ── 7 mapping/meta fields ─────────────────────────────────────────────────
    party_code_normalized: Annotated[str | None, Indexed()] = None
    customer_name:         Annotated[str | None, Indexed()] = None
    customer_code_id:      Annotated[str | None, Indexed()] = None
    report_date:           Annotated[str, Indexed()]         # "dd-mm-yyyy"; always set by ingest
    source_file:           str | None = None
    created_at:            Annotated[datetime, Indexed()] = Field(default_factory=_now_utc)
    updated_at:            datetime = Field(default_factory=_now_utc)  # NOT indexed (BE-4)

    class Settings:
        name = "jsw_stock"

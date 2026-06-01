"""JswStock document -> public DTO serialisation. No I/O, no side-effects.

id = str(doc.id) — ObjectId never leaks to callers (api-contract-standards, owasp-security).
All 72 Excel columns + 7 mapping/meta fields mapped directly.
No region lookup needed — customer_name / customer_code_id already stored on the document.
"""
from __future__ import annotations

from typing import TYPE_CHECKING

from ...schemas.jsw_stock_record import JswStockPublic

if TYPE_CHECKING:
    from ...models.jsw_stock import JswStock


def to_jsw_stock_public(doc: "JswStock") -> JswStockPublic:
    """Map a JswStock document to JswStockPublic.

    id = str(doc.id) — ObjectId never leaks to callers.
    All 72 domain fields + 7 meta fields mapped directly.
    No region lookup needed (customer_name / customer_code_id already stored).
    """
    return JswStockPublic(
        id=str(doc.id),
        # ---------------------------------------------------------------
        # Excel columns 1–72 (pass through; types guaranteed by model)
        # ---------------------------------------------------------------
        # Col 1 — SO Sales Org
        so_sales_org=doc.so_sales_org,
        # Col 2 — Sales Order Type
        sales_order_type=doc.sales_order_type,
        # Col 3 — Distr.Chnl
        distr_chnl=doc.distr_chnl,
        # Col 4 — Sold To Party
        sold_to_party=doc.sold_to_party,
        # Col 5 — Party Code
        party_code=doc.party_code,
        # Col 6 — Ship To Party
        ship_to_party=doc.ship_to_party,
        # Col 7 — Customer
        customer=doc.customer,
        # Col 8 — Material
        material=doc.material,
        # Col 9 — Sales Office
        sales_office=doc.sales_office,
        # Col 10 — SO-Product Form
        so_product_form=doc.so_product_form,
        # Col 11 — JSW Grade
        jsw_grade=doc.jsw_grade,
        # Col 12 — Act.Thickness (mm) [text]
        act_thickness_mm=doc.act_thickness_mm,
        # Col 13 — Width (mm) [text]
        width_mm=doc.width_mm,
        # Col 14 — Batch
        batch=doc.batch,
        # Col 15 — Unrestr.Qty. [number]
        unrestr_qty=doc.unrestr_qty,
        # Col 16 — In Quality Insp. [number]
        in_quality_insp=doc.in_quality_insp,
        # Col 17 — Blocked [number]
        blocked=doc.blocked,
        # Col 18 — Stock Quantity [number]
        stock_quantity=doc.stock_quantity,
        # Col 19 — Usage Decision
        usage_decision=doc.usage_decision,
        # Col 20 — NCO Declared
        nco_declared=doc.nco_declared,
        # Col 21 — Next Workcenter
        next_workcenter=doc.next_workcenter,
        # Col 22 — Length(mm) [text]
        length_mm=doc.length_mm,
        # Col 23 — NCO Reason
        nco_reason=doc.nco_reason,
        # Col 24 — UD Remarks
        ud_remarks=doc.ud_remarks,
        # Col 25 — Aging [number]
        aging=doc.aging,
        # Col 26 — Production Date [date]
        production_date=doc.production_date,
        # Col 27 — Shift
        shift=doc.shift,
        # Col 28 — Sales Order No
        sales_order_no=doc.sales_order_no,
        # Col 29 — SO Item Num
        so_item_num=doc.so_item_num,
        # Col 30 — Order Status
        order_status=doc.order_status,
        # Col 31 — Location
        location=doc.location,
        # Col 32 — STR No
        str_no=doc.str_no,
        # Col 33 — STO No
        sto_no=doc.sto_no,
        # Col 34 — DO No
        do_no=doc.do_no,
        # Col 35 — Shipment
        shipment=doc.shipment,
        # Col 36 — Storage Location
        storage_location=doc.storage_location,
        # Col 37 — Port Name
        port_name=doc.port_name,
        # Col 38 — UNLOADING POINT
        unloading_point=doc.unloading_point,
        # Col 39 — RECIEVING POINT (sic — matches real Excel header)
        recieving_point=doc.recieving_point,
        # Col 40 — Purchase Order Number
        purchase_order_number=doc.purchase_order_number,
        # Col 41 — Scheduled Status
        scheduled_status=doc.scheduled_status,
        # Col 42 — Eq. Specification
        eq_specification=doc.eq_specification,
        # Col 43 — Eq. Sub Grade
        eq_sub_grade=doc.eq_sub_grade,
        # Col 44 — SO-End Application
        so_end_application=doc.so_end_application,
        # Col 45 — production workcenter
        production_workcenter=doc.production_workcenter,
        # Col 46 — YS in MPa [number]
        ys_in_mpa=doc.ys_in_mpa,
        # Col 47 — ELONGATION [text — BE-2]
        elongation=doc.elongation,
        # Col 48 — Elongation(Mic) [number]
        elongation_mic=doc.elongation_mic,
        # Col 49 — HARDNESS [text — BE-2]
        hardness=doc.hardness,
        # Col 50 — S_ALUMINIUM_PCT [number]
        s_aluminium_pct=doc.s_aluminium_pct,
        # Col 51 — S_BORON_PCT [number]
        s_boron_pct=doc.s_boron_pct,
        # Col 52 — S_CARBON_PCT [number]
        s_carbon_pct=doc.s_carbon_pct,
        # Col 53 — S_CHROMIUM_PCT [number]
        s_chromium_pct=doc.s_chromium_pct,
        # Col 54 — S_COPPER_PCT [number]
        s_copper_pct=doc.s_copper_pct,
        # Col 55 — S_MANGANESE_PCT [number]
        s_manganese_pct=doc.s_manganese_pct,
        # Col 56 — S_MOLYBDENUM_PCT [number]
        s_molybdenum_pct=doc.s_molybdenum_pct,
        # Col 57 — S_NICKEL_PCT [number]
        s_nickel_pct=doc.s_nickel_pct,
        # Col 58 — S_NIOBIUM_PCT [number]
        s_niobium_pct=doc.s_niobium_pct,
        # Col 59 — S_PHOSPHORUS_PCT [number]
        s_phosphorus_pct=doc.s_phosphorus_pct,
        # Col 60 — S_SILICON_PCT [number]
        s_silicon_pct=doc.s_silicon_pct,
        # Col 61 — S_SULPHUR_PCT [number]
        s_sulphur_pct=doc.s_sulphur_pct,
        # Col 62 — S_TITANIUM_PCT [number]
        s_titanium_pct=doc.s_titanium_pct,
        # Col 63 — S_VANADIUM_PCT [number]
        s_vanadium_pct=doc.s_vanadium_pct,
        # Col 64 — Tensile Strength MPa (B) [number; malformed cells → None]
        tensile_strength_mpa_b=doc.tensile_strength_mpa_b,
        # Col 65 — YIELD STRENGTH [text — BE-2]
        yield_strength=doc.yield_strength,
        # Col 66 — UTS [text — BE-2]
        uts=doc.uts,
        # Col 67 — Special Stock
        special_stock=doc.special_stock,
        # Col 68 — CP Number
        cp_number=doc.cp_number,
        # Col 69 — CP End Date [date]
        cp_end_date=doc.cp_end_date,
        # Col 70 — LC Exp Date [text/str — BE-1: verbatim dd.mm.yyyy string]
        lc_exp_date=doc.lc_exp_date,
        # Col 71 — Route
        route=doc.route,
        # Col 72 — Route Desc
        route_desc=doc.route_desc,
        # ---------------------------------------------------------------
        # Mapping + meta fields (appended at ingestion time)
        # ---------------------------------------------------------------
        party_code_normalized=doc.party_code_normalized,
        customer_name=doc.customer_name,
        customer_code_id=doc.customer_code_id,
        report_date=doc.report_date,
        source_file=doc.source_file,
        created_at=doc.created_at,
        updated_at=doc.updated_at,
    )

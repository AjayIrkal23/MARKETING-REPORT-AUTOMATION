"""RAKE drill-down — reverse-resolve one RAKE to its individual stock rows.

Given a RAKE value (e.g. ``CWCJ``) + date + optional region + aging filter,
return every individual jsw AND jvml stock row for that RAKE — NOT aggregated.
The RAKE→party-code link is the same first-doc-wins ``CustomerCode`` mapping the
report uses (see ``generate.py::_build_pivot_rows``).

**Always queries BOTH collections** (union jsw + jvml), independent of the report's
``report_type`` — the drill-down is the complete cross-stock customer list for the
RAKE. So in ``both`` report mode the summed quantity equals the report's RAKE
total; in single ``jsw``/``jvml`` mode it is a superset (it also includes the
other stock's rows for the same RAKE — intentional).

transport_mode / destination are NOT on the stock row — they come from the
``CustomerCode`` master, looked up per normalized party code (same as the report).
"""

from __future__ import annotations

from typing import Any

from ...models.jsw_stock import JswStock
from ...models.jvml_stock import JvmlStock
from ...schemas.report import (
    RakeDrilldownQuery,
    RakeDrilldownResponse,
    RakeDrilldownRow,
)
from .generate import _resolve_region_customers, _strip_or_none
from .pivot import qa_hold_match

# Stock collections queried for a drill-down: always BOTH (union jsw + jvml).
_STOCK_MODELS: tuple[tuple[str, type], ...] = (("jsw", JswStock), ("jvml", JvmlStock))


async def rake_drilldown(query: RakeDrilldownQuery) -> RakeDrilldownResponse:
    """Return individual jsw + jvml stock rows for one RAKE.

    Args:
        query: validated ``rake`` / ``date`` / ``region_id`` / ``days``.

    Returns:
        The drill-down payload — individual rows + the summed quantity.
    """
    region_name, _codes, first_doc, _rakes = await _resolve_region_customers(
        query.region_id
    )

    # Codes whose first-doc RAKE matches the target (first-doc-wins, as the report).
    target = query.rake.strip()
    code_codes = {
        nc
        for nc, doc in first_doc.items()
        if (doc.rake or "").strip() == target
    }

    if not code_codes:
        return RakeDrilldownResponse(
            rake=target,
            date=query.date,
            region_id=query.region_id,
            region_name=region_name,
            days_filter=query.days,
            rows=[],
            total_quantity=0.0,
        )

    match: dict[str, Any] = {
        "report_date": query.date,
        "party_code_normalized": {"$in": list(code_codes)},
    }
    match.update(qa_hold_match(query.days))

    rows: list[RakeDrilldownRow] = []
    total = 0.0
    for stock_type, model in _STOCK_MODELS:
        docs = await model.find(match).to_list()
        for doc in docs:
            nc = doc.party_code_normalized
            cc = first_doc.get(nc) if nc else None
            qty = float(doc.stock_quantity or 0.0)
            total += qty
            rows.append(
                RakeDrilldownRow(
                    stock_type=stock_type,
                    so_sales_org=_strip_or_none(doc.so_sales_org),
                    distr_chnl=_strip_or_none(doc.distr_chnl),
                    sold_to_party=_strip_or_none(doc.sold_to_party),
                    sales_office=_strip_or_none(doc.sales_office),
                    party_code=_strip_or_none(nc),
                    ship_to_party=_strip_or_none(doc.ship_to_party),
                    transport_mode=_strip_or_none(cc.transport_mode) if cc else None,
                    destination=_strip_or_none(cc.destination) if cc else None,
                    customer_name=_strip_or_none(doc.customer_name),
                    stock_quantity=qty,
                )
            )

    # Stable display order: source, then the report's grouping hierarchy.
    rows.sort(
        key=lambda r: (
            r.stock_type,
            r.so_sales_org or "",
            r.distr_chnl or "",
            r.sold_to_party or "",
            r.party_code or "",
            r.ship_to_party or "",
        )
    )

    return RakeDrilldownResponse(
        rake=target,
        date=query.date,
        region_id=query.region_id,
        region_name=region_name,
        days_filter=query.days,
        rows=rows,
        # Round the Python row-by-row sum so float order doesn't drift the display
        # vs the report's group-wise total (WR-01).
        total_quantity=round(total, 3),
    )

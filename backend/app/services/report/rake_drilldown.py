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
    RakeDrilldownMergedRow,
    RakeDrilldownQuery,
    RakeDrilldownResponse,
    RakeDrilldownRow,
)
from .generate import _resolve_region_customers, _strip_or_none
from .pivot import qa_hold_match

# Stock collections queried for a drill-down: always BOTH (union jsw + jvml).
_STOCK_MODELS: tuple[tuple[str, type], ...] = (("jsw", JswStock), ("jvml", JvmlStock))

# 8-field merge identity, in order — the row's stable key for export-time exclusion
# matching. Both RakeDrilldownRow and RakeDrilldownMergedRow carry all 8 fields.
_IDENTITY_FIELDS: tuple[str, ...] = (
    "so_sales_org",
    "distr_chnl",
    "sales_office",
    "sold_to_party",
    "party_code",
    "transport_mode",
    "destination",
    "customer_name",
)


def row_identity(row: RakeDrilldownRow | RakeDrilldownMergedRow) -> str:
    """Canonical identity string for a drill-down row (mirror of the frontend
    ``rake-exclusions.ts::rowKey``). Values are post-strip with ``None`` → ``""``,
    joined by the US separator. party_code is already normalized. Must match the
    frontend byte-for-byte so unchecked rows are excluded from the export."""
    return chr(31).join((getattr(row, f, None) or "").strip() for f in _IDENTITY_FIELDS)


def _merge_rows(rows: list[RakeDrilldownRow]) -> list[RakeDrilldownMergedRow]:
    """Collapse rows sharing the same 8-field identity into one, summing quantity.

    Merge key (product spec): so_sales_org, distr_chnl, sales_office (BRANCH),
    sold_to_party, party_code, transport_mode, destination, customer_name. NOT in
    the key — and dropped from the merged shape — are stock_type (Source) and
    ship_to_party, which can vary within a merged group. The summed quantity is
    invariant under grouping, so Σ merged == Σ rows == total_quantity.
    """
    groups: dict[tuple, RakeDrilldownMergedRow] = {}
    for r in rows:
        key = (
            r.so_sales_org,
            r.distr_chnl,
            r.sales_office,
            r.sold_to_party,
            r.party_code,
            r.transport_mode,
            r.destination,
            r.customer_name,
        )
        existing = groups.get(key)
        if existing is None:
            groups[key] = RakeDrilldownMergedRow(
                so_sales_org=r.so_sales_org,
                distr_chnl=r.distr_chnl,
                sales_office=r.sales_office,
                sold_to_party=r.sold_to_party,
                party_code=r.party_code,
                transport_mode=r.transport_mode,
                destination=r.destination,
                customer_name=r.customer_name,
                stock_quantity=r.stock_quantity,
            )
        else:
            existing.stock_quantity += r.stock_quantity

    merged = list(groups.values())
    for m in merged:
        # Round once at the end so float order doesn't drift the displayed sum (WR-01).
        m.stock_quantity = round(m.stock_quantity, 3)
    merged.sort(
        key=lambda m: (
            m.so_sales_org or "",
            m.distr_chnl or "",
            m.sales_office or "",
            m.sold_to_party or "",
            m.party_code or "",
            m.transport_mode or "",
            m.destination or "",
            m.customer_name or "",
        )
    )
    return merged


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
            merged_rows=[],
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

    # Stable display order: source, then the report's grouping hierarchy
    # (BRANCH / sales_office sits right after Distr. Channel, above Sold To Party).
    rows.sort(
        key=lambda r: (
            r.stock_type,
            r.so_sales_org or "",
            r.distr_chnl or "",
            r.sales_office or "",
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
        merged_rows=_merge_rows(rows),
        # Round the Python row-by-row sum so float order doesn't drift the display
        # vs the report's group-wise total (WR-01).
        total_quantity=round(total, 3),
    )

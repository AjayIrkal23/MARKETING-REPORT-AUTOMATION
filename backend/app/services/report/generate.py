"""Report JSW/JVML orchestrator — region → codes → pivot → credit → assemble.

See ``.planning/report-jsw-jvml/SPEC.md`` §2 for the algorithm. All business
booleans (``has_stock``, ``has_credit_report``, ``blocked``, ``credit_status``)
are decided here so the frontend only renders.
"""

from __future__ import annotations

from typing import Any

from ...models.customer_code import CustomerCode
from ...models.jsw_stock import JswStock
from ...models.jvml_stock import JvmlStock
from ...schemas.report import (
    ReportChannel,
    ReportParty,
    ReportQuery,
    ReportResponse,
)
from ...services.customer_code.region_link import resolve_region_or_400
from ...utils.report.normalize import normalize_code
from .credit import build_credit_map, coil_price_per_qty
from .pivot import aggregate_pivot

# Report type → (stock model, credit control area).
_REPORT_MAP: dict[str, tuple[type, str]] = {
    "jsw": (JswStock, "VJ0H"),
    "jvml": (JvmlStock, "JV0H"),
}

# Channel display order; unknown channels sort after these (alphabetical),
# and a null/blank channel is bucketed as "Unspecified" and sorts last.
_CHANNEL_ORDER = [
    "MSME", "OEM", "Retail", "SBU-A", "Stock Transfer",
    "Auction", "Others", "SEZ/Deemed Export",
]
_UNSPECIFIED = "Unspecified"


def _channel_sort_key(name: str) -> tuple[int, str]:
    """Sort key: known channels by defined order, then unknowns A-Z, Unspecified last."""
    if name == _UNSPECIFIED:
        return (len(_CHANNEL_ORDER) + 1, "")
    if name in _CHANNEL_ORDER:
        return (_CHANNEL_ORDER.index(name), "")
    return (len(_CHANNEL_ORDER), name.lower())


async def _resolve_codes(region_id: str | None) -> tuple[str, set[str]]:
    """Resolve region → (region_name, normalized customer codes).

    Empty *region_id* ⇒ all regions / all customer codes. A non-empty but
    invalid id raises ``ValidationError`` (400) via ``resolve_region_or_400``.
    """
    if region_id:
        region = await resolve_region_or_400(region_id)
        region_name = region.name
        docs = await CustomerCode.find({"region_id": region_id}).to_list()
    else:
        region_name = "All Regions"
        docs = await CustomerCode.find({}).to_list()

    codes = {nc for d in docs if (nc := normalize_code(d.code))}
    return region_name, codes


def _augment_credit(
    total: float,
    nco_yes_do: float,
    party_key: str,
    has_credit_report: bool,
    credit_map: dict[str, dict[str, Any]],
    price_per_qty: float | None,
) -> dict[str, Any]:
    """Compute the per-party credit columns (required credit + status/blocked)."""
    required = (
        (total - nco_yes_do) * price_per_qty if price_per_qty is not None else None
    )

    if not has_credit_report:
        return {
            "blocked": None, "credit_balance": None, "required_credit": required,
            "credit_sufficient": None, "credit_status": "NO CREDIT REPORT FOUND",
            "credit_note": "NO CREDIT REPORT FOUND",
        }

    entry = credit_map.get(party_key)
    balance = entry["credit_balance"] if entry else None
    if entry is None or balance is None:
        return {
            "blocked": entry["blocked"] if entry else None,
            "credit_balance": None, "required_credit": required,
            "credit_sufficient": None, "credit_status": "No Credit balance",
            "credit_note": "No Credit balance",
        }

    sufficient = balance >= required if required is not None else None
    if balance < 0:
        note = "Balance Negative"
    elif sufficient is False:
        note = "Not Enough Balance"
    else:
        note = "Balance Available"  # sufficient True, or no required to compare
    return {
        "blocked": entry["blocked"], "credit_balance": balance,
        "required_credit": required, "credit_sufficient": sufficient,
        "credit_status": "", "credit_note": note,
    }


def _build_channels(
    rows: list[dict[str, Any]],
    has_credit_report: bool,
    credit_map: dict[str, dict[str, Any]],
    price_per_qty: float | None,
) -> list[ReportChannel]:
    """Group aggregation rows into ordered channels with parties + subtotals."""
    grouped: dict[str, list[ReportParty]] = {}

    for row in rows:
        ident = row["_id"]
        channel = ident.get("distr_chnl") or _UNSPECIFIED
        party_key = ident["party"]
        total = float(row.get("total") or 0.0)
        nco_yes_do = float(row.get("nco_yes_do") or 0.0)

        credit = _augment_credit(
            total, nco_yes_do, party_key, has_credit_report, credit_map, price_per_qty
        )
        grouped.setdefault(channel, []).append(
            ReportParty(
                party_code=party_key,
                sold_to_party=row.get("sold_to_party"),
                route_desc=row.get("route_desc"),
                total=total,
                nco_yes_do=nco_yes_do,
                nco_yes_do_count=int(row.get("nco_yes_do_count") or 0),
                **credit,
            )
        )

    channels: list[ReportChannel] = []
    for name in sorted(grouped, key=_channel_sort_key):
        parties = sorted(grouped[name], key=lambda p: p.party_code)
        req_vals = [p.required_credit for p in parties if p.required_credit is not None]
        channels.append(
            ReportChannel(
                distr_chnl=name,
                parties=parties,
                subtotal=sum(p.total for p in parties),
                subtotal_nco_yes_do=sum(p.nco_yes_do for p in parties),
                subtotal_required_credit=sum(req_vals) if req_vals else None,
            )
        )
    return channels


async def generate_report(query: ReportQuery) -> ReportResponse:
    """Build the full Report JSW/JVML payload for *query*."""
    stock_model, cca = _REPORT_MAP[query.report_type]

    region_name, normalized_codes = await _resolve_codes(query.region_id)
    price_per_qty = await coil_price_per_qty()

    has_stock = await stock_model.find({"report_date": query.date}).count() > 0
    has_credit_report, credit_map = await build_credit_map(query.date, cca)

    channels: list[ReportChannel] = []
    if has_stock and normalized_codes:
        rows = await aggregate_pivot(
            stock_model, query.date, list(normalized_codes), query.days
        )
        channels = _build_channels(
            rows, has_credit_report, credit_map, price_per_qty
        )

    grand_req = [
        c.subtotal_required_credit
        for c in channels
        if c.subtotal_required_credit is not None
    ]
    return ReportResponse(
        date=query.date,
        report_type=query.report_type,
        region_id=query.region_id,
        region_name=region_name,
        days_filter=query.days,
        cca=cca,
        has_stock=has_stock,
        has_credit_report=has_credit_report,
        coil_price_per_qty=price_per_qty,
        channels=channels,
        grand_total=sum(c.subtotal for c in channels),
        grand_nco_yes_do=sum(c.subtotal_nco_yes_do for c in channels),
        grand_required_credit=sum(grand_req) if grand_req else None,
    )

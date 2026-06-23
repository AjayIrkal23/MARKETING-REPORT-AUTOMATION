"""Credit-report lookup + coil pricing for the Report JSW/JVML feature.

Two concerns:
  * ``coil_price_per_qty`` — the active coil price, expressed per unit quantity.
  * ``build_credit_map`` — per-party Blocked + Credit Balance for the report's
    credit control area, keyed by the normalized customer code.
"""

from __future__ import annotations

from ...models.coil_price import CoilPrice
from ...models.credit_report import CreditReport
from ...utils.report.normalize import normalize_code


async def coil_price_per_qty() -> float | None:
    """Return ``price / quantity`` for the active coil price, or ``None``.

    Picks the active coil-price entry with the lowest ``quantity`` (the explicit
    ``.sort("+quantity")`` is required — without it MongoDB returns insertion
    order, per AUDIT.md). ``None`` when there is no active price or its quantity
    is zero (un-dividable).
    """
    doc = await CoilPrice.find({"active": True}).sort("+quantity").first_or_none()
    if doc is None or not doc.quantity:
        return None
    return doc.price / doc.quantity


async def build_credit_map(
    date: str, ccas: list[str]
) -> tuple[bool, dict[str, dict[str, object]]]:
    """Return ``(has_credit_report, {normalized_customer: {blocked, credit_balance}})``.

    Scoped to the report's credit control areas *ccas* (jsw→["VJ0H", "1000"] /
    jvml→["JV0H"]) at the query level (SPEC §2.6): ``has_credit_report`` is True
    only when credit rows exist for at least one of these CCAs on *date*. A
    customer may appear under multiple CCAs, so a date-level check could report
    "found" while this report type's CCAs have no rows — yielding a wrong "No
    Credit balance" instead of "NO CREDIT REPORT FOUND" (the credit report file
    is gated to both CCAs, so in practice both are present or neither is).

    Args:
        date: Report date ``dd-mm-yyyy``.
        ccas: Credit control areas for this report type.

    Returns:
        ``(has_credit_report, credit_map)``. ``blocked`` is ``blocked == "X"``.
        First row per normalized customer wins.
    """
    docs = await CreditReport.find(
        {"report_date": date, "credit_control_area": {"$in": ccas}}
    ).to_list()
    has_credit_report = len(docs) > 0

    credit_map: dict[str, dict[str, object]] = {}
    for doc in docs:
        key = normalize_code(doc.customer)
        if key and key not in credit_map:
            credit_map[key] = {
                "blocked": doc.blocked == "X",
                "credit_balance": doc.credit_balance,
            }

    return has_credit_report, credit_map

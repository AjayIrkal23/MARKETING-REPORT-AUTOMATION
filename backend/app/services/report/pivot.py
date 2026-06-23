"""RAKE-pivot aggregation for the Report JSW/JVML feature.

Builds the row-level aggregation grouped by the stock row fields
(SO Sales Org → Distr. Channel → Sold To Party → Sales Office → Party Code →
Ship-To Party) for one date, restricted to a set of normalized customer codes,
with the aging day-filter applied.

CustomerCode enrichment (RAKE, Transport Mode, Destination, ROUTE) and the
RAKE-column pivot happen in ``services.report.generate`` after this step.
"""

from __future__ import annotations

from typing import Any


def qa_hold_match(days: str) -> dict[str, Any]:
    """Return the QA-hold aging match clause for a day-filter.

    The filter is defined around a single predicate — "aged QA-hold stock":
    a row with ``in_quality_insp > 0`` AND rounded ``aging > 2``. Aging is
    rounded to a whole number of days (``$round`` to 0 decimals) before the cut,
    so decimals never straddle the boundary — 2.4 → 2 (kept), 2.6 → 3 (aged);
    exact halves follow Mongo's round-half-to-even. The comparisons are
    null-safe (a missing/``null`` ``in_quality_insp`` or ``aging`` is NOT aged
    QA-hold), so normal non-QA stock is treated correctly without a type guard.

    Three modes:
        * ``include`` → no filter (all stock).
        * ``exclude`` → everything EXCEPT aged QA-hold (all normal data + the
          QA-hold that is still ≤ 2 days). This is the default working view.
        * ``only``    → ONLY aged QA-hold (in_quality_insp > 0 AND aging > 2).

    ``include`` is the union of ``exclude`` and ``only`` (they partition the
    data at the aged-QA-hold predicate).

    Args:
        days: ``"include"`` | ``"exclude"`` | ``"only"``.

    Returns:
        A partial match dict (empty for ``include``).
    """
    # "Aged QA-hold": in QA inspection AND held more than 2 (rounded) days.
    aged_qa_hold = {
        "$and": [
            {"$gt": ["$in_quality_insp", 0]},
            {"$gt": [{"$round": ["$aging", 0]}, 2]},
        ]
    }
    if days == "exclude":
        return {"$expr": {"$not": [aged_qa_hold]}}
    if days == "only":
        return {"$expr": aged_qa_hold}
    return {}


async def aggregate_pivot(
    stock_model: type,
    date: str,
    normalized_codes: list[str],
    days: str,
) -> list[dict[str, Any]]:
    """Aggregate stock rows for *date* over *normalized_codes*.

    Args:
        stock_model: ``JswStock`` or ``JvmlStock`` Beanie Document class.
        date: Report date ``dd-mm-yyyy`` (exact match on ``report_date``).
        normalized_codes: Party codes (already ``lstrip("0")``) to include —
            matched against the stored ``party_code_normalized`` field.
        days: QA-hold aging day-filter (see :func:`qa_hold_match`).

    Returns:
        A list of group dicts, each shaped::

            {"_id": {"so_sales_org": str|None,
                     "distr_chnl": str|None,
                     "sold_to_party": str|None,
                     "sales_office": str|None,
                     "party": str,
                     "ship_to_party": str|None},
             "total": float,
             "nco_yes_do": float,
             "nco_yes_do_count": int}

    Enrichment with ``CustomerCode`` (RAKE, Transport Mode, Destination, ROUTE)
    and the RAKE-column pivot are applied downstream by
    ``services.report.generate``.
    """
    match: dict[str, Any] = {
        "report_date": date,
        "party_code_normalized": {"$in": normalized_codes},
    }
    match.update(qa_hold_match(days))

    is_nco_yes = {"$eq": ["$nco_declared", "Yes"]}
    pipeline: list[dict[str, Any]] = [
        {"$match": match},
        {
            "$group": {
                "_id": {
                    "so_sales_org": "$so_sales_org",
                    "distr_chnl": "$distr_chnl",
                    "sold_to_party": "$sold_to_party",
                    "sales_office": "$sales_office",
                    "party": "$party_code_normalized",
                    "ship_to_party": "$ship_to_party",
                },
                "total": {"$sum": "$stock_quantity"},
                "nco_yes_do": {
                    "$sum": {"$cond": [is_nco_yes, "$stock_quantity", 0]}
                },
                "nco_yes_do_count": {"$sum": {"$cond": [is_nco_yes, 1, 0]}},
            }
        },
    ]

    return await stock_model.aggregate(pipeline).to_list()

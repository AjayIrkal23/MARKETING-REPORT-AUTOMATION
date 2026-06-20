"""Stock pivot aggregation for the Report JSW/JVML feature.

Builds the "Sum of Stock Quantity" pivot (grouped by ``distr_chnl`` →
``party_code_normalized``) for one date, restricted to a set of normalized
customer codes, with the aging day-filter applied. Runs a single MongoDB
``$group`` aggregation (no per-row Python work — ``backend-performance-standards``;
the jvml collection holds ~17k rows).

Returns raw ``list[dict]`` aggregation results (no ``projection_model`` — passing
a Pydantic model would inject Beanie's auto-``$project`` and break the
sub-document ``_id`` access, per AUDIT.md).
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
    """Aggregate the stock pivot for *date* over *normalized_codes*.

    Args:
        stock_model: ``JswStock`` or ``JvmlStock`` Beanie Document class.
        date: Report date ``dd-mm-yyyy`` (exact match on ``report_date``).
        normalized_codes: Party codes (already ``lstrip("0")``) to include —
            matched against the stored ``party_code_normalized`` field.
        days: QA-hold aging day-filter (see :func:`qa_hold_match`).

    Returns:
        A list of group dicts, each shaped::

            {"_id": {"distr_chnl": str|None, "party": str},
             "total": float, "nco_yes_do": float, "nco_yes_do_count": int,
             "sold_to_party": str|None, "route_desc": str|None}

    ``route`` and ``ship_to_party`` are added downstream by
    ``services.report.generate`` from the ``CustomerCode`` master lookup.
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
                    "distr_chnl": "$distr_chnl",
                    "party": "$party_code_normalized",
                },
                "total": {"$sum": "$stock_quantity"},
                "nco_yes_do": {
                    "$sum": {"$cond": [is_nco_yes, "$stock_quantity", 0]}
                },
                "nco_yes_do_count": {"$sum": {"$cond": [is_nco_yes, 1, 0]}},
                "sold_to_party": {"$first": "$sold_to_party"},
                "route_desc": {"$first": "$route_desc"},
            }
        },
    ]

    return await stock_model.aggregate(pipeline).to_list()

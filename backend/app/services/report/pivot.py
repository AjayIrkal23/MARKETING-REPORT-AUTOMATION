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


def aging_match(days: str) -> dict[str, Any]:
    """Return the ``aging`` match clause for a day-filter.

    MongoDB comparison operators are type-bracketed: ``{"$lte": 2}`` / ``{"$gt":
    2}`` match only numeric ``aging`` values, so a ``null`` aging falls into
    neither ``exclude`` nor ``only`` (it appears only under ``include``), exactly
    as specified.

    Args:
        days: ``"include"`` | ``"exclude"`` | ``"only"``.

    Returns:
        A partial match dict (empty for ``include``).
    """
    if days == "exclude":
        return {"aging": {"$lte": 2}}
    if days == "only":
        return {"aging": {"$gt": 2}}
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
        days: Aging day-filter (see :func:`aging_match`).

    Returns:
        A list of group dicts, each shaped::

            {"_id": {"distr_chnl": str|None, "party": str},
             "total": float, "nco_yes_do": float, "nco_yes_do_count": int,
             "sold_to_party": str|None, "route_desc": str|None}
    """
    match: dict[str, Any] = {
        "report_date": date,
        "party_code_normalized": {"$in": normalized_codes},
    }
    match.update(aging_match(days))

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

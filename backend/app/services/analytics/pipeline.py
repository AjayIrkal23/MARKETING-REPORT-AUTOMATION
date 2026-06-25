"""MongoDB aggregation pipeline builder for the analytics dashboard.

The pipeline aggregates ``jsw_stock`` and/or ``jvml_stock`` over a date range,
joins ``customer_codes`` to obtain ``rake``, ``transport_mode``, ``segment``,
and ``route``, then produces the series that power the dashboard charts.
"""

from __future__ import annotations

from typing import Any

from ...schemas.analytics import AnalyticsQuery
from ...services.report.pivot import qa_hold_match

# Fields that live directly on the stock document.
_STOCK_DIMENSIONS = {"distr_chnl", "sales_office", "customer_name"}

# Fields that live on the joined CustomerCode document.
_CUSTOMER_DIMENSIONS = {"segment", "transport_mode", "rake", "route"}

# Series configuration: (key, title, chart_type, dimension_source, dimension_field)
SERIES_CONFIG: tuple[tuple[str, str, str, str, str], ...] = (
    ("rake", "RAKE totals", "bar", "customer", "rake"),
    ("transport_mode", "Transport mode", "pie", "customer", "transport_mode"),
    ("distr_chnl", "Distribution channel", "bar", "stock", "distr_chnl"),
    ("segment", "OEM / Segment", "pie", "customer", "segment"),
    ("customer", "Customer-wise totals", "horizontal_bar", "stock", "customer_name"),
)


def _date_expr(date_str: str) -> dict[str, Any]:
    """Return a MongoDB expression that parses ``dd-mm-yyyy`` to a date."""
    return {
        "$dateFromString": {
            "dateString": date_str,
            "format": "%d-%m-%Y",
            "onError": None,
        }
    }


def _build_match(query: AnalyticsQuery, region_customer_ids: set[str] | None) -> dict[str, Any]:
    """Build the initial `$match` stage for the stock collection."""
    from_dt = _date_expr(query.fromDate)
    to_dt = _date_expr(query.toDate)

    match: dict[str, Any] = {
        "$expr": {
            "$and": [
                {
                    "$gte": [
                        {
                            "$dateFromString": {
                                "dateString": "$report_date",
                                "format": "%d-%m-%Y",
                                "onError": None,
                            }
                        },
                        from_dt,
                    ]
                },
                {
                    "$lte": [
                        {
                            "$dateFromString": {
                                "dateString": "$report_date",
                                "format": "%d-%m-%Y",
                                "onError": None,
                            }
                        },
                        to_dt,
                    ]
                },
            ]
        }
    }

    if region_customer_ids:
        match["customer_code_id"] = {"$in": list(region_customer_ids)}

    # QA-hold aging filter (same predicate as Report JSW/JVML).
    match.update(qa_hold_match(query.days))

    # Per-dimension multi-select filters.
    for field in _STOCK_DIMENSIONS:
        values = getattr(query, field)
        if values:
            match[field] = {"$in": values}

    return match


def _lookup_customer() -> dict[str, Any]:
    """Return a `$lookup` stage joining stock rows to ``customer_codes``."""
    return {
        "$lookup": {
            "from": "customer_codes",
            "localField": "party_code_normalized",
            "foreignField": "code",
            "as": "_customer",
        }
    }


def _unwind_customer() -> dict[str, Any]:
    """Unwind the looked-up customer array, keeping rows even if no match."""
    return {"$unwind": {"path": "$_customer", "preserveNullAndEmptyArrays": True}}


def _apply_customer_filters(query: AnalyticsQuery) -> dict[str, Any] | None:
    """Return a `$match` stage for CustomerCode-based dimension filters, if any."""
    filters: dict[str, Any] = {}
    for field in _CUSTOMER_DIMENSIONS:
        values = getattr(query, field)
        if values:
            filters[f"_customer.{field}"] = {"$in": values}
    return {"$match": filters} if filters else None


def _group_stage(dimension_expr: dict[str, Any]) -> dict[str, Any]:
    """Return a `$group` stage summing stock_quantity and NCO Yes+DO."""
    return {
        "$group": {
            "_id": dimension_expr,
            "value": {"$sum": "$stock_quantity"},
            "nco_yes_do": {
                "$sum": {
                    "$cond": [{"$eq": ["$nco_declared", "Yes"]}, "$stock_quantity", 0]
                }
            },
        }
    }


def _series_sort(limit: int | None = None) -> list[dict[str, Any]]:
    """Sort descending by value and optionally cap results."""
    stages: list[dict[str, Any]] = [{"$sort": {"value": -1}}]
    if limit:
        stages.append({"$limit": limit})
    return stages


def _build_facet(query: AnalyticsQuery) -> dict[str, Any]:  # noqa: ARG001
    """Build the `$facet` stage that produces every chart series in parallel."""
    facet_pipes: dict[str, list[dict[str, Any]]] = {}

    for key, _title, _chart_type, source, field in SERIES_CONFIG:
        if source == "customer":
            dim_expr = f"$_customer.{field}"
        else:
            dim_expr = f"${field}"

        pipeline: list[dict[str, Any]] = [
            _group_stage({"label": dim_expr}),
            *_series_sort(limit=30 if key == "customer" else None),
            {
                "$project": {
                    "_id": 0,
                    "label": {"$ifNull": ["$_id.label", "(blank)"]},
                    "value": {"$round": ["$value", 2]},
                    "nco_yes_do": {"$round": ["$nco_yes_do", 2]},
                }
            },
        ]
        facet_pipes[key] = pipeline

    # KPI facet: totals + unique customer id set.
    facet_pipes["kpi"] = [
        {
            "$group": {
                "_id": None,
                "total_stock": {"$sum": "$stock_quantity"},
                "nco_yes_do": {
                    "$sum": {
                        "$cond": [{"$eq": ["$nco_declared", "Yes"]}, "$stock_quantity", 0]
                    }
                },
                "unique_customer_ids": {"$addToSet": "$customer_code_id"},
            }
        },
        {
            "$project": {
                "_id": 0,
                "total_stock": {"$round": ["$total_stock", 2]},
                "nco_yes_do": {"$round": ["$nco_yes_do", 2]},
                "unique_customer_ids": 1,
            }
        },
    ]

    return {"$facet": facet_pipes}


def build_analytics_pipeline(
    query: AnalyticsQuery,
    region_customer_ids: set[str] | None,
) -> list[dict[str, Any]]:
    """Return the complete aggregation pipeline for one stock collection."""
    pipeline: list[dict[str, Any]] = [
        {"$match": _build_match(query, region_customer_ids)},
        _lookup_customer(),
        _unwind_customer(),
    ]

    customer_filter = _apply_customer_filters(query)
    if customer_filter:
        pipeline.append(customer_filter)

    pipeline.append(_build_facet(query))
    return pipeline


def _merge_series_points(
    left_points: list[dict[str, Any]],
    right_points: list[dict[str, Any]] | None = None,
) -> list[dict[str, Any]]:
    """Merge one or two lists of {label, value, nco_yes_do} by label, summing values."""
    merged: dict[str, dict[str, Any]] = {}
    for p in list(left_points) + list(right_points or []):
        label = p["label"]
        if label not in merged:
            merged[label] = {"label": label, "value": 0.0, "nco_yes_do": 0.0}
        merged[label]["value"] += p["value"]
        merged[label]["nco_yes_do"] += p.get("nco_yes_do", 0.0)
    result = list(merged.values())
    result.sort(key=lambda x: x["value"], reverse=True)
    return result


def combine_collection_results(
    left: dict[str, Any] | None,
    right: dict[str, Any] | None,
) -> dict[str, Any]:
    """Combine the `$facet` output of two stock collections (JSW + JVML)."""
    if not left:
        return right or {}
    if not right:
        return left

    combined: dict[str, Any] = {}
    for key in left:
        if key == "kpi":
            # Should be a single-element list; sum fields, union unique id sets.
            lk = (left[key] or [{}])[0]
            rk = (right[key] or [{}])[0]
            left_ids = set(lk.get("unique_customer_ids") or [])
            right_ids = set(rk.get("unique_customer_ids") or [])
            combined[key] = [
                {
                    "total_stock": round(lk.get("total_stock", 0.0) + rk.get("total_stock", 0.0), 2),
                    "nco_yes_do": round(lk.get("nco_yes_do", 0.0) + rk.get("nco_yes_do", 0.0), 2),
                    "unique_customer_ids": list(left_ids | right_ids),
                }
            ]
        else:
            combined[key] = _merge_series_points(left[key] or [], right[key] or [])
    return combined

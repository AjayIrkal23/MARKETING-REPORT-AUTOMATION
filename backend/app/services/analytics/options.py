"""Async options for analytics dashboard multi-select filters.

Returns distinct values for each supported dimension, optionally filtered by a
search string and constrained by the current report type / date range / region.
"""

from __future__ import annotations

from typing import Any

from ...models.customer_code import CustomerCode
from ...models.jsw_stock import JswStock
from ...models.jvml_stock import JvmlStock
from ...schemas.admin_user import AsyncOption
from ...schemas.analytics import AnalyticsOptionsQuery, DIMENSION_FIELDS
from ...services.customer_code.region_link import resolve_region_or_400
from ...utils.report.normalize import normalize_code

# Fields stored on CustomerCode.
_CUSTOMER_FIELDS = {"segment", "transport_mode", "rake", "route"}

# Fields stored on stock documents.
_STOCK_FIELDS = {"distr_chnl", "sales_office", "customer_name"}

_REPORT_MODELS: dict[str, type] = {
    "jsw": JswStock,
    "jvml": JvmlStock,
}


def _option_label(value: str | None) -> str:
    return value.strip() if value else "(blank)"


def _options_from_values(values: list[Any]) -> list[AsyncOption]:
    """Deduplicate and map raw distinct values to ``AsyncOption`` objects."""
    seen: set[str] = set()
    options: list[AsyncOption] = []
    for v in values:
        label = _option_label(v)
        if label in seen:
            continue
        seen.add(label)
        options.append(AsyncOption(value=label, label=label))
    return options


def _apply_search(options: list[AsyncOption], q: str | None) -> list[AsyncOption]:
    if not q:
        return options
    needle = q.strip().lower()
    return [o for o in options if needle in o.label.lower()]


async def _customer_field_options(query: AnalyticsOptionsQuery) -> list[AsyncOption]:
    """Distinct values for a CustomerCode-based dimension."""
    match: dict[str, Any] = {}

    if query.region:
        region = await resolve_region_or_400(query.region)
        match["region_id"] = str(region.id)

    field = query.field
    pipeline: list[dict[str, Any]] = [
        {"$match": match} if match else {"$match": {}},
        {"$group": {"_id": f"${field}"}},
        {"$sort": {"_id": 1}},
    ]

    rows = await CustomerCode.aggregate(pipeline).to_list()
    values = [row["_id"] for row in rows]
    options = _options_from_values(values)
    return _apply_search(options, query.q)[: query.limit]


async def _stock_field_options(query: AnalyticsOptionsQuery) -> list[AsyncOption]:
    """Distinct values for a stock-document dimension, scoped by date range."""
    models = [_REPORT_MODELS[query.reportType]] if query.reportType != "both" else list(_REPORT_MODELS.values())

    region_ids: set[str] = set()
    if query.region:
        region = await resolve_region_or_400(query.region)
        docs = await CustomerCode.find({"region_id": str(region.id)}).to_list()
        region_ids = {str(doc.id) for doc in docs if doc.id is not None}

    seen: set[str] = set()
    field = query.field

    for model in models:
        match: dict[str, Any] = {}
        if query.fromDate and query.toDate:
            match["$expr"] = {
                "$and": [
                    {
                        "$gte": [
                            {"$dateFromString": {"dateString": "$report_date", "format": "%d-%m-%Y", "onError": None}},
                            {"$dateFromString": {"dateString": query.fromDate, "format": "%d-%m-%Y", "onError": None}},
                        ]
                    },
                    {
                        "$lte": [
                            {"$dateFromString": {"dateString": "$report_date", "format": "%d-%m-%Y", "onError": None}},
                            {"$dateFromString": {"dateString": query.toDate, "format": "%d-%m-%Y", "onError": None}},
                        ]
                    },
                ]
            }
        if region_ids:
            match["customer_code_id"] = {"$in": list(region_ids)}

        pipeline: list[dict[str, Any]] = [
            {"$match": match},
            {"$group": {"_id": f"${field}"}},
        ]
        rows = await model.aggregate(pipeline).to_list()
        for row in rows:
            label = _option_label(row["_id"])
            if label not in seen:
                seen.add(label)

    options = [AsyncOption(value=label, label=label) for label in sorted(seen)]
    return _apply_search(options, query.q)[: query.limit]


async def search_analytics_options(query: AnalyticsOptionsQuery) -> list[AsyncOption]:
    """Return async-combobox options for a single analytics dimension."""
    if query.field in _CUSTOMER_FIELDS:
        return await _customer_field_options(query)
    if query.field in _STOCK_FIELDS:
        return await _stock_field_options(query)
    return []

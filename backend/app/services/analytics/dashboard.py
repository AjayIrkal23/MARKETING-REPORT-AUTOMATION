"""Analytics dashboard orchestrator.

Resolves region filters, runs the aggregation pipeline on the requested stock
collection(s), and assembles the ``AnalyticsDashboardData`` response.
"""

from __future__ import annotations

from typing import Any

from ...models.customer_code import CustomerCode
from ...models.jsw_stock import JswStock
from ...models.jvml_stock import JvmlStock
from ...models.region import Region
from ...schemas.analytics import (
    AnalyticsDashboardData,
    AnalyticsPoint,
    AnalyticsQuery,
    AnalyticsSeries,
)
from ...services.customer_code.region_link import resolve_region_or_400
from .pipeline import SERIES_CONFIG, build_analytics_pipeline, combine_collection_results

_REPORT_MODELS: dict[str, type] = {
    "jsw": JswStock,
    "jvml": JvmlStock,
}


async def _resolve_region_customer_ids(region_id: str | None) -> tuple[str | None, set[str] | None]:
    """Resolve region to a set of ``customer_code_id`` hex strings.

    Returns ``(region_name, ids)``.  When *region_id* is ``None`` the returned
    set is ``None`` and no region filter is applied.
    """
    if not region_id:
        return None, None

    region = await resolve_region_or_400(region_id)
    docs = await CustomerCode.find({"region_id": region_id}).to_list()
    ids = {str(doc.id) for doc in docs if doc.id is not None}
    return region.name, ids


async def _aggregate_collection(
    model: type,
    query: AnalyticsQuery,
    region_customer_ids: set[str] | None,
) -> dict[str, Any]:
    """Run the analytics pipeline on a single stock collection."""
    pipeline = build_analytics_pipeline(query, region_customer_ids)
    result = await model.aggregate(pipeline).to_list()
    return result[0] if result else {}


def _build_series(key: str, title: str, chart_type: str, points: list[dict[str, Any]]) -> AnalyticsSeries:
    """Create an ``AnalyticsSeries`` from raw aggregation points."""
    data = [
        AnalyticsPoint(
            label=str(p["label"]),
            value=float(p["value"]),
            extra={"nco_yes_do": float(p.get("nco_yes_do", 0.0))},
        )
        for p in points
    ]

    # Cap customer chart to top 30 and bucket the rest as "Others" so the
    # chart total still equals the KPI total.
    if key == "customer" and len(data) > 30:
        top = data[:30]
        others_value = sum(p.value for p in data[30:])
        others_nco = sum(p.extra.get("nco_yes_do", 0.0) for p in data[30:])
        top.append(
            AnalyticsPoint(
                label="Others",
                value=round(others_value, 2),
                extra={"nco_yes_do": round(others_nco, 2)},
            )
        )
        data = top

    total = sum(p.value for p in data)
    return AnalyticsSeries(
        key=key,
        title=title,
        chart_type=chart_type,  # type: ignore[arg-type]
        total=round(total, 2),
        data=data,
    )


def _extract_kpi(raw: dict[str, Any]) -> dict[str, Any]:
    """Extract KPI values from the combined ``$facet`` output."""
    kpi_list = raw.get("kpi") or [{}]
    kpi = kpi_list[0] if kpi_list else {}
    ids = kpi.get("unique_customer_ids") or []
    return {
        "total_stock": float(kpi.get("total_stock", 0.0)),
        "nco_yes_do": float(kpi.get("nco_yes_do", 0.0)),
        "unique_customers": len(set(ids)),
    }


async def get_analytics_dashboard(query: AnalyticsQuery) -> AnalyticsDashboardData:
    """Build the full analytics dashboard payload for *query*."""
    region_name, region_customer_ids = await _resolve_region_customer_ids(query.region)

    report_types = ["jsw", "jvml"] if query.reportType == "both" else [query.reportType]

    combined: dict[str, Any] | None = None
    for rt in report_types:
        model = _REPORT_MODELS[rt]
        partial = await _aggregate_collection(model, query, region_customer_ids)
        combined = combine_collection_results(combined, partial)

    combined = combined or {}
    kpi = _extract_kpi(combined)

    series = [
        _build_series(key, title, chart_type, combined.get(key, []))
        for key, title, chart_type, _source, _field in SERIES_CONFIG
    ]

    return AnalyticsDashboardData(
        from_date=query.fromDate,
        to_date=query.toDate,
        report_type=query.reportType,
        region_name=region_name,
        days_filter=query.days,
        kpi_total_stock=kpi["total_stock"],
        kpi_nco_yes_do=kpi["nco_yes_do"],
        kpi_unique_customers=kpi["unique_customers"],
        series=series,
    )

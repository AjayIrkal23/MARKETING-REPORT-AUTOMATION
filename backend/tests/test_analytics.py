"""Unit tests for analytics dashboard aggregation helpers.

Covers pipeline shape, result combination, and series construction without
requiring a live MongoDB connection.
"""

from __future__ import annotations

import pytest

from app.schemas.analytics import AnalyticsQuery, AnalyticsSeries
from app.services.analytics.dashboard import _build_series, _extract_kpi
from app.services.analytics.pipeline import (
    SERIES_CONFIG,
    build_analytics_pipeline,
    combine_collection_results,
)


def test_pipeline_contains_date_range_match() -> None:
    """The pipeline must parse report_date and apply inclusive date bounds."""
    query = AnalyticsQuery(fromDate="01-06-2026", toDate="10-06-2026")
    pipeline = build_analytics_pipeline(query, None)

    match_stage = pipeline[0]["$match"]
    assert "$expr" in match_stage
    expr = match_stage["$expr"]
    assert "$and" in expr
    assert len(expr["$and"]) == 2


def test_pipeline_contains_customer_lookup_and_unwind() -> None:
    """The pipeline must join customer_codes and unwind the result."""
    query = AnalyticsQuery(fromDate="01-06-2026", toDate="10-06-2026")
    pipeline = build_analytics_pipeline(query, None)

    assert pipeline[1]["$lookup"]["from"] == "customer_codes"
    assert pipeline[2]["$unwind"]["path"] == "$_customer"


def test_pipeline_contains_all_series_facets() -> None:
    """The $facet stage must include every configured series plus kpi."""
    query = AnalyticsQuery(fromDate="01-06-2026", toDate="10-06-2026")
    pipeline = build_analytics_pipeline(query, None)

    facet_stage = pipeline[-1]["$facet"]
    expected_keys = {key for key, *_ in SERIES_CONFIG} | {"kpi"}
    assert set(facet_stage.keys()) == expected_keys


def test_region_filter_uses_customer_code_id() -> None:
    """When a region is provided, the initial match uses customer_code_id."""
    query = AnalyticsQuery(fromDate="01-06-2026", toDate="10-06-2026")
    pipeline = build_analytics_pipeline(query, {"id1", "id2"})

    match_stage = pipeline[0]["$match"]
    assert set(match_stage["customer_code_id"]["$in"]) == {"id1", "id2"}


def test_combine_collection_results_sums_kpis() -> None:
    """Combining two collection results sums totals and NCO values."""
    left = {
        "kpi": [{"total_stock": 100.0, "nco_yes_do": 10.0, "unique_customer_ids": ["a", "b"]}],
        "rake": [{"label": "KKU", "value": 100.0, "nco_yes_do": 10.0}],
    }
    right = {
        "kpi": [{"total_stock": 50.0, "nco_yes_do": 5.0, "unique_customer_ids": ["b", "c", "d"]}],
        "rake": [{"label": "KKU", "value": 50.0, "nco_yes_do": 5.0}],
    }

    combined = combine_collection_results(left, right)
    kpi = combined["kpi"][0]
    assert kpi["total_stock"] == 150.0
    assert kpi["nco_yes_do"] == 15.0
    assert set(kpi["unique_customer_ids"]) == {"a", "b", "c", "d"}


def test_combine_collection_results_merges_series_by_label() -> None:
    """Series points with the same label are merged and summed."""
    left = {"transport_mode": [
        {"label": "RAKE", "value": 80.0, "nco_yes_do": 0.0},
        {"label": "ROAD", "value": 20.0, "nco_yes_do": 0.0},
    ]}
    right = {"transport_mode": [
        {"label": "RAKE", "value": 20.0, "nco_yes_do": 0.0},
        {"label": "ROAD/RAKE", "value": 50.0, "nco_yes_do": 0.0},
    ]}

    combined = combine_collection_results(left, right)
    by_label = {p["label"]: p["value"] for p in combined["transport_mode"]}
    assert by_label["RAKE"] == 100.0
    assert by_label["ROAD"] == 20.0
    assert by_label["ROAD/RAKE"] == 50.0


def test_build_series_caps_customer_chart_with_others() -> None:
    """Customer series with >30 points keeps top 30 and buckets the rest."""
    points = [
        {"label": f"Customer {i}", "value": float(50 - i), "nco_yes_do": 0.0}
        for i in range(35)
    ]
    series = _build_series("customer", "Customer-wise totals", "horizontal_bar", points)

    assert isinstance(series, AnalyticsSeries)
    assert len(series.data) == 31  # top 30 + Others
    labels = [p.label for p in series.data]
    assert "Others" in labels


def test_extract_kpi_handles_empty_result() -> None:
    """KPI extraction safely defaults when no aggregation result is present."""
    kpi = _extract_kpi({})
    assert kpi["total_stock"] == 0.0
    assert kpi["nco_yes_do"] == 0.0
    assert kpi["unique_customers"] == 0


def test_query_defaults_to_today_when_dates_omitted() -> None:
    """AnalyticsQuery must default missing fromDate/toDate to today."""
    from datetime import datetime

    query = AnalyticsQuery()
    today = datetime.now().strftime("%d-%m-%Y")
    assert query.fromDate == today
    assert query.toDate == today

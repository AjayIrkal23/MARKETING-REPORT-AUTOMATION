"""Analytics dashboard request/response DTOs.

Powers ``GET /analytics/stock-dashboard`` — a total-only aggregation view of
JSW/JVML stock across date ranges, grouped by RAKE, transport mode,
distribution channel, segment, and customer.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator


def _today_dd_mm_yyyy() -> str:
    """Return today's date formatted as dd-MM-yyyy."""
    return datetime.now(timezone.utc).strftime("%d-%m-%Y")

ReportTypeT = Literal["jsw", "jvml", "both"]
DaysFilterT = Literal["include", "exclude", "only"]
AnalyticsChartTypeT = Literal["bar", "pie", "horizontal_bar"]

DIMENSION_FIELDS = frozenset({
    "distr_chnl",
    "sales_office",
    "customer_name",
    "segment",
    "transport_mode",
    "rake",
    "route",
})


class AnalyticsQuery(BaseModel):
    """Query params for ``GET /analytics/stock-dashboard``."""

    reportType: ReportTypeT = "both"
    fromDate: str = Field(default_factory=_today_dd_mm_yyyy, pattern=r"^\d{2}-\d{2}-\d{4}$")
    toDate: str = Field(default_factory=_today_dd_mm_yyyy, pattern=r"^\d{2}-\d{2}-\d{4}$")
    region: str | None = Field(default=None, max_length=64)
    days: DaysFilterT = "include"

    # multi-select dimension filters (repeated query params become lists)
    distr_chnl: list[str] | None = None
    sales_office: list[str] | None = None
    customer_name: list[str] | None = None
    segment: list[str] | None = None
    transport_mode: list[str] | None = None
    rake: list[str] | None = None
    route: list[str] | None = None

    @field_validator("fromDate", "toDate")
    @classmethod
    def _strip_dates(cls, v: str) -> str:
        return v.strip()

    @field_validator("toDate")
    @classmethod
    def _date_order(cls, v: str, info) -> str:
        from_date = info.data.get("fromDate")
        if from_date:
            try:
                from_dt = datetime.strptime(from_date, "%d-%m-%Y")
                to_dt = datetime.strptime(v, "%d-%m-%Y")
            except ValueError as exc:
                raise ValueError("Invalid date format") from exc
            if to_dt < from_dt:
                raise ValueError("toDate cannot be earlier than fromDate")
        return v


class AnalyticsOptionsQuery(BaseModel):
    """Query params for ``GET /analytics/options``."""

    field: str = Field(min_length=1, max_length=40)
    q: str | None = Field(default=None, max_length=100)
    limit: int = Field(default=50, ge=1, le=200)
    reportType: ReportTypeT = "both"
    fromDate: str | None = Field(default=None, pattern=r"^\d{2}-\d{2}-\d{4}$")
    toDate: str | None = Field(default=None, pattern=r"^\d{2}-\d{2}-\d{4}$")
    region: str | None = Field(default=None, max_length=64)

    @field_validator("field")
    @classmethod
    def _valid_field(cls, v: str) -> str:
        if v not in DIMENSION_FIELDS:
            raise ValueError(f"Unsupported analytics field: {v}")
        return v


class AnalyticsPoint(BaseModel):
    """One labelled value in a chart series."""

    label: str
    value: float
    extra: dict[str, Any] | None = None


class AnalyticsSeries(BaseModel):
    """One chart series (e.g. RAKE totals)."""

    key: str
    title: str
    chart_type: AnalyticsChartTypeT
    total: float
    data: list[AnalyticsPoint]


class AnalyticsDashboardData(BaseModel):
    """Full payload for the analytics dashboard."""

    from_date: str
    to_date: str
    report_type: ReportTypeT
    region_name: str | None
    days_filter: DaysFilterT
    kpi_total_stock: float
    kpi_nco_yes_do: float
    kpi_unique_customers: int
    series: list[AnalyticsSeries]

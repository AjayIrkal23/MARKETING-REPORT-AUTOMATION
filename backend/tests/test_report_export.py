"""Unit test for Report JSW/JVML RAKE-pivot Excel export.

Mocks the report generator so no MongoDB connection is required.
"""

from __future__ import annotations

import asyncio
from unittest.mock import AsyncMock, patch

from app.schemas.report import ReportPivotRow, ReportQuery, ReportResponse
from app.services.report.export import export_report


def _fake_report() -> ReportResponse:
    row = ReportPivotRow(
        so_sales_org="1001",
        distr_chnl="OEM",
        sold_to_party="ACME Steels Ltd",
        sales_office="Mumbai",
        party_code="40122581",
        ship_to_party="ACME Ship-To",
        transport_mode="ROAD/RAKE",
        destination="Jaipur",
        route="KAT138",
        rake_quantities={"KKU": 55.01, "ROAD": 0.0},
        total=55.01,
        nco_yes_do=0.0,
        nco_yes_do_count=0,
        blocked=False,
        credit_balance=500000.0,
        required_credit=55.01,
        credit_sufficient=True,
        credit_status="",
        credit_note="Balance Available",
    )
    return ReportResponse(
        date="23-06-2026",
        report_type="jsw",
        region_id=None,
        region_name="All Regions",
        days_filter="include",
        ccas=["VJ0H", "1000"],
        has_stock=True,
        has_credit_report=True,
        coil_price_per_qty=1.0,
        rake_columns=["KKU", "ROAD"],
        rows=[row],
        grand_total=55.01,
        grand_nco_yes_do=0.0,
        grand_required_credit=55.01,
    )


def test_export_builds_xlsx_bytes() -> None:
    """export_report should return non-empty .xlsx bytes."""
    with patch(
        "app.services.report.export.generate_report",
        new=AsyncMock(return_value=_fake_report()),
    ):
        query = ReportQuery(date="23-06-2026", report_type="jsw")
        data = asyncio.run(export_report(query))

    assert isinstance(data, bytes)
    assert len(data) > 0
    assert data.startswith(b"PK")  # .xlsx is a zip archive

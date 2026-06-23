"""Unit test for Report JSW/JVML Excel export.

Mocks the report generator so no MongoDB connection is required.
"""

from __future__ import annotations

import asyncio
from unittest.mock import AsyncMock, patch

from app.schemas.report import ReportChannel, ReportParty, ReportQuery, ReportResponse
from app.services.report.export import export_report


def _fake_report() -> ReportResponse:
    party = ReportParty(
        party_code="40122581",
        sold_to_party="ACME Steels Ltd",
        ship_to_party=None,
        route=None,
        route_desc=None,
        rake="KKU",
        transport_mode="ROAD/RAKE",
        total=100.0,
        nco_yes_do=10.0,
        nco_yes_do_count=1,
        blocked=False,
        credit_balance=500000.0,
        required_credit=90.0,
        credit_sufficient=True,
        credit_status="",
        credit_note="Balance Available",
    )
    channel = ReportChannel(
        distr_chnl="OEM",
        parties=[party],
        subtotal=100.0,
        subtotal_nco_yes_do=10.0,
        subtotal_required_credit=90.0,
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
        coil_price_per_qty=0.9,
        channels=[channel],
        grand_total=100.0,
        grand_nco_yes_do=10.0,
        grand_required_credit=90.0,
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

"""Unit test for Credit Report Excel export.

Mocks the Beanie query layer so no MongoDB connection is required.
"""

from __future__ import annotations

import asyncio
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

from app.schemas.credit_report import CreditReportListQuery
from app.services.credit_report.export import export_credit_report


def _make_doc(**kwargs: object) -> SimpleNamespace:
    """Build a minimal fake CreditReport document for the visible export columns."""
    defaults = {
        "report_date": "23-06-2026",
        "customer_name": "ACME Steels",
        "city": "Mumbai",
        "customer": "000040122581",
        "credit_control_area": "VJ0H",
        "cca_description": "JSW Steel Ltd",
        "blocked": "",
        "currency": "INR",
        "cca_credit_limit": 1000000.0,
        "credit_exposure": 500000.0,
        "credit_balance": 500000.0,
        "overdue": 0.0,
        "total_receivables": 500000.0,
    }
    defaults.update(kwargs)
    return SimpleNamespace(**defaults)


def test_export_builds_xlsx_bytes() -> None:
    """export_credit_report should return non-empty .xlsx bytes."""
    fake_doc = _make_doc()

    mock_find = MagicMock()
    mock_find.sort = MagicMock(return_value=mock_find)
    mock_find.to_list = AsyncMock(return_value=[fake_doc])

    with patch(
        "app.services.credit_report.export.CreditReport.find",
        return_value=mock_find,
    ):
        with patch(
            "app.services.credit_report.export.CustomerCode.find",
            return_value=MagicMock(to_list=AsyncMock(return_value=[]))(),
        ):
            query = CreditReportListQuery(date="23-06-2026")
            data = asyncio.run(export_credit_report(query))

    assert isinstance(data, bytes)
    assert len(data) > 0
    assert data.startswith(b"PK")  # .xlsx is a zip archive

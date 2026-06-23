"""Unit test for JSW Stock Excel export.

Mocks the Beanie query layer so no MongoDB connection is required.
"""

from __future__ import annotations

import asyncio
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

from app.schemas.jsw_stock import JswStockListQuery
from app.services.jsw_stock.export import export_jsw_stock


def _make_doc(**kwargs: object) -> SimpleNamespace:
    """Build a minimal fake JswStock document for the visible export columns."""
    defaults = {
        "report_date": "23-06-2026",
        "party_code": "000040122581",
        "customer_name": "ACME Steels",
        "sold_to_party": "ACME Steels Ltd",
        "material": "HR Coil",
        "jsw_grade": "SAE1006",
        "sales_office": "MH01",
        "sales_order_type": "ZOR",
        "distr_chnl": "OEM",
        "batch": "BATCH001",
        "unrestr_qty": 10.0,
        "stock_quantity": 12.0,
        "nco_declared": "YES",
        "aging": 5.0,
    }
    defaults.update(kwargs)
    return SimpleNamespace(**defaults)


def test_export_builds_xlsx_bytes() -> None:
    """export_jsw_stock should return non-empty .xlsx bytes."""
    fake_doc = _make_doc()

    mock_find = MagicMock()
    mock_find.sort = MagicMock(return_value=mock_find)
    mock_find.to_list = AsyncMock(return_value=[fake_doc])

    with patch(
        "app.services.jsw_stock.export.JswStock.find",
        return_value=mock_find,
    ):
        with patch(
            "app.services.jsw_stock.export.CustomerCode.find",
            return_value=MagicMock(to_list=AsyncMock(return_value=[]))(),
        ):
            query = JswStockListQuery(date="23-06-2026")
            data = asyncio.run(export_jsw_stock(query))

    assert isinstance(data, bytes)
    assert len(data) > 0
    assert data.startswith(b"PK")  # .xlsx is a zip archive

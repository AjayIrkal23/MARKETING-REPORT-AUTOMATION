"""Unit tests for CustomerCode-sourced route / ship-to enrichment in the report."""

from __future__ import annotations

import asyncio
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

from app.models.customer_code import CustomerCode
from app.services.report.generate import _build_channels, _resolve_region_customers


def _sample_row(party: str, total: float = 10.0, nco: float = 0.0) -> dict:
    return {
        "_id": {"distr_chnl": "OEM", "party": party},
        "total": total,
        "nco_yes_do": nco,
        "nco_yes_do_count": 0,
        "sold_to_party": f"Sold {party}",
        "route_desc": f"Desc {party}",
    }


def test_build_channels_adds_route_and_ship_to_party() -> None:
    rows = [_sample_row("4012")]
    customer_extra = {"4012": ("KAT036", "Acme Ship-To", "KKU", "ROAD/RAKE")}

    channels = _build_channels(
        rows,
        has_credit_report=False,
        credit_map={},
        price_per_qty=None,
        customer_extra=customer_extra,
    )

    assert len(channels) == 1
    channel = channels[0]
    assert channel.distr_chnl == "OEM"
    assert len(channel.parties) == 1
    party = channel.parties[0]
    assert party.party_code == "4012"
    assert party.route == "KAT036"
    assert party.ship_to_party == "Acme Ship-To"
    assert party.rake == "KKU"
    assert party.transport_mode == "ROAD/RAKE"
    assert party.sold_to_party == "Sold 4012"
    assert party.route_desc == "Desc 4012"


def test_build_channels_missing_enrichment_is_none() -> None:
    rows = [_sample_row("9999")]

    channels = _build_channels(
        rows,
        has_credit_report=False,
        credit_map={},
        price_per_qty=None,
        customer_extra={},
    )
    party = channels[0].parties[0]
    assert party.route is None
    assert party.ship_to_party is None
    assert party.rake is None
    assert party.transport_mode is None


def _customer_doc(**kwargs: object) -> SimpleNamespace:
    defaults = {
        "segment": "OEM",
        "customer": "X",
        "destination": "Y",
        "region_id": "r1",
        "route": None,
        "ship_to": None,
        "ship_to_customer": None,
        "rake": None,
        "transport_mode": None,
    }
    defaults.update(kwargs)
    return SimpleNamespace(**defaults)


def test_resolve_region_customers_maps_route_and_ship_to_customer() -> None:
    docs = [
        _customer_doc(
            code="004012",
            route="KAT036",
            ship_to="5001",
            ship_to_customer="Acme Ship-To ",  # trailing space should be stripped
            rake="KKU ",
            transport_mode=" ROAD/RAKE ",
        )
    ]
    mock_find = AsyncMock()
    mock_find.to_list = AsyncMock(return_value=docs)
    with patch.object(CustomerCode, "find", return_value=mock_find):
        region_name, codes, extra = asyncio.run(_resolve_region_customers(None))

    assert region_name == "All Regions"
    assert codes == {"4012"}
    assert extra == {"4012": ("KAT036", "Acme Ship-To", "KKU", "ROAD/RAKE")}


def test_resolve_region_customers_falls_back_when_name_blank() -> None:
    docs = [
        _customer_doc(
            code="8481",
            route="RTP012",
            ship_to="6002",
            ship_to_customer="   ",
            rake="   ",
            transport_mode="   ",
        )
    ]
    mock_find = AsyncMock()
    mock_find.to_list = AsyncMock(return_value=docs)
    with patch.object(CustomerCode, "find", return_value=mock_find):
        _, codes, extra = asyncio.run(_resolve_region_customers(None))

    assert codes == {"8481"}
    assert extra == {"8481": ("RTP012", "6002", None, None)}

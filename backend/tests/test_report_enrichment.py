"""Unit tests for CustomerCode-sourced enrichment in the RAKE pivot report."""

from __future__ import annotations

import asyncio
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

from app.models.customer_code import CustomerCode
from app.services.report.generate import (
    _build_pivot_rows,
    _filter_used_rakes,
    _resolve_region_customers,
)


def _sample_row(
    party: str,
    so_sales_org: str | None = "1001",
    distr_chnl: str | None = "Retail",
    sold_to_party: str | None = "Acme",
    sales_office: str | None = "Mumbai",
    ship_to_party: str | None = "Acme Ship-To",
    total: float = 10.0,
    nco: float = 0.0,
) -> dict:
    return {
        "_id": {
            "so_sales_org": so_sales_org,
            "distr_chnl": distr_chnl,
            "sold_to_party": sold_to_party,
            "sales_office": sales_office,
            "party": party,
            "ship_to_party": ship_to_party,
        },
        "total": total,
        "nco_yes_do": nco,
        "nco_yes_do_count": 0,
    }


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


def test_build_pivot_rows_adds_customer_code_enrichment() -> None:
    rows = [_sample_row("4012")]
    customer_map = {
        "4012": _customer_doc(
            code="004012",
            route="KAT036",
            destination="Mumbai",
            rake="KKU",
            transport_mode="ROAD/RAKE",
        )
    }
    rake_columns = ["KKU", "ROAD"]

    pivot_rows = _build_pivot_rows(
        rows,
        has_credit_report=False,
        credit_map={},
        price_per_qty=None,
        customer_map=customer_map,
        rake_columns=rake_columns,
    )

    assert len(pivot_rows) == 1
    row = pivot_rows[0]
    assert row.party_code == "4012"
    assert row.so_sales_org == "1001"
    assert row.distr_chnl == "Retail"
    assert row.sales_office == "Mumbai"
    assert row.route == "KAT036"
    assert row.destination == "Mumbai"
    assert row.rake_quantities == {"KKU": 10.0, "ROAD": 0.0}
    assert row.transport_mode == "ROAD/RAKE"
    assert row.total == 10.0


def test_build_pivot_rows_missing_enrichment_is_none() -> None:
    rows = [_sample_row("9999")]

    pivot_rows = _build_pivot_rows(
        rows,
        has_credit_report=False,
        credit_map={},
        price_per_qty=None,
        customer_map={},
        rake_columns=["KKU"],
    )
    row = pivot_rows[0]
    assert row.route is None
    assert row.destination is None
    assert row.transport_mode is None
    assert row.rake_quantities == {"KKU": 0.0}


def test_resolve_region_customers_maps_first_doc_and_collects_rakes() -> None:
    docs = [
        _customer_doc(
            code="004012",
            route="KAT036",
            destination="Mumbai",
            rake="KKU ",
            transport_mode=" ROAD/RAKE ",
        ),
        _customer_doc(
            code="004012",
            route="KAT999",
            destination="Pune",
            rake="ROAD",
            transport_mode="ROAD",
        ),
    ]
    mock_find = AsyncMock()
    mock_find.to_list = AsyncMock(return_value=docs)
    with patch.object(CustomerCode, "find", return_value=mock_find):
        region_name, codes, customer_map, rakes = asyncio.run(_resolve_region_customers(None))

    assert region_name == "All Regions"
    assert codes == {"4012"}
    assert set(rakes) == {"KKU", "ROAD"}
    assert customer_map["4012"].route == "KAT036"  # first doc wins


def test_filter_used_rakes_drops_empty_columns_and_prunes_rows() -> None:
    # Two rows: only "KKU" and "ROAD" carry stock; "KRIR"/"KSV" are all-zero.
    rows = _build_pivot_rows(
        [_sample_row("4012", total=10.0), _sample_row("8481", total=5.0)],
        has_credit_report=False,
        credit_map={},
        price_per_qty=None,
        customer_map={
            "4012": _customer_doc(code="4012", rake="KKU"),
            "8481": _customer_doc(code="8481", rake="ROAD"),
        },
        rake_columns=["KKU", "KRIR", "KSV", "ROAD"],
    )

    kept = _filter_used_rakes(rows, ["KKU", "KRIR", "KSV", "ROAD"])

    assert kept == ["KKU", "ROAD"]  # order preserved, empties dropped
    # Each row's rake_quantities pruned to the kept columns only.
    assert set(rows[0].rake_quantities) == {"KKU", "ROAD"}
    assert rows[0].rake_quantities["KKU"] == 10.0
    assert rows[1].rake_quantities["ROAD"] == 5.0


def test_resolve_region_customers_strips_blank_rake() -> None:
    docs = [
        _customer_doc(
            code="8481",
            route="RTP012",
            rake="   ",
            transport_mode="RAKE",
        )
    ]
    mock_find = AsyncMock()
    mock_find.to_list = AsyncMock(return_value=docs)
    with patch.object(CustomerCode, "find", return_value=mock_find):
        _, codes, customer_map, rakes = asyncio.run(_resolve_region_customers(None))

    assert codes == {"8481"}
    assert rakes == []
    assert customer_map["8481"].rake == "   "  # raw doc value; stripping happens downstream

"""Unit tests for the RAKE drill-down merge (8-field identity + summed qty)."""

from app.schemas.report import RakeDrilldownRow
from app.services.report.rake_drilldown import _merge_rows


def _row(stock_type="jsw", party="40007137", ship="Mittal Agencies", qty=10.0):
    return RakeDrilldownRow(
        stock_type=stock_type,
        so_sales_org="1001",
        distr_chnl="Retail",
        sold_to_party="Mittal Agencies",
        sales_office="Pune",
        party_code=party,
        ship_to_party=ship,
        transport_mode="RAKE",
        destination="Pune",
        customer_name="Mittal agencies",
        stock_quantity=qty,
    )


def test_merge_sums_identity_ignoring_source_and_ship_to():
    rows = [
        _row(ship="Mittal Agencies", qty=31.3),
        _row(ship="VST INFRA", qty=31.0),       # different ship_to → still merges
        _row(stock_type="jvml", qty=10.0),       # different source → still merges
    ]
    merged = _merge_rows(rows)
    assert len(merged) == 1
    assert merged[0].stock_quantity == 72.3
    # dropped columns are absent from the merged shape
    assert not hasattr(merged[0], "stock_type")
    assert not hasattr(merged[0], "ship_to_party")


def test_merge_keeps_distinct_party_codes_separate():
    merged = _merge_rows([_row(party="40007137", qty=5.0), _row(party="40020381", qty=3.0)])
    assert len(merged) == 2


def test_merge_total_is_invariant():
    rows = [_row(qty=1.1), _row(party="X", qty=2.2), _row(stock_type="jvml", qty=3.3)]
    merged = _merge_rows(rows)
    assert round(sum(m.stock_quantity for m in merged), 3) == 6.6


def test_merge_empty():
    assert _merge_rows([]) == []

"""Unit tests for export-time RAKE exclusion helpers (pure, no DB).

Covers the keystone: a raw stock doc's reconstructed identity must equal the
drill-down ``row_identity`` byte-for-byte, and excluding an identity must drop
every matching pivot row (incl. ship-to splits) and recompute the totals.
"""

from __future__ import annotations

from types import SimpleNamespace

from app.schemas.report import (
    CombinedExportBody,
    RakeDrilldownRow,
    RakeExclusion,
    ReportPivotRow,
    ReportResponse,
)
from app.services.report.exclusion import (
    apply_pivot_exclusions,
    excluded_key_union,
    filter_stock_docs,
    stock_doc_identity,
)
from app.services.report.generate import _build_pivot_rows
from app.services.report.rake_drilldown import row_identity


def _pivot_row(customer_name: str | None, total: float, rake: str = "KKU") -> ReportPivotRow:
    return ReportPivotRow(
        so_sales_org="1001",
        distr_chnl="Retail",
        sold_to_party="Acme",
        sales_office="Mumbai",
        party_code="4012",
        ship_to_party="ST",
        customer_name=customer_name,
        transport_mode="ROAD",
        destination="Pune",
        route=None,
        rake_quantities={rake: total},
        total=total,
        nco_yes_do=0.0,
        nco_yes_do_count=0,
        blocked=None,
        credit_balance=None,
        required_credit=None,
        credit_sufficient=None,
        credit_status="",
        credit_note="",
    )


def test_stock_doc_identity_matches_row_identity() -> None:
    """A raw stock doc + first_doc must rebuild the exact drill-down identity."""
    doc = SimpleNamespace(
        so_sales_org=" 1001 ",  # whitespace proves stripping parity
        distr_chnl="Retail",
        sales_office="Mumbai",
        sold_to_party="Acme",
        party_code_normalized="4012",
        customer_name="ACME STEEL",
    )
    first_doc = {"4012": SimpleNamespace(transport_mode="ROAD", destination="Pune")}

    equivalent = RakeDrilldownRow(
        stock_type="jsw",
        so_sales_org="1001",
        distr_chnl="Retail",
        sold_to_party="Acme",
        sales_office="Mumbai",
        party_code="4012",
        ship_to_party="ST",  # not in the key
        transport_mode="ROAD",
        destination="Pune",
        customer_name="ACME STEEL",
        stock_quantity=5.0,
    )

    assert stock_doc_identity(doc, first_doc) == row_identity(equivalent)


def test_stock_doc_identity_missing_first_doc_blanks_tm_dest() -> None:
    """No CustomerCode match ⇒ transport_mode/destination collapse to ''."""
    doc = SimpleNamespace(
        so_sales_org="1001", distr_chnl="Retail", sales_office="Mumbai",
        sold_to_party="Acme", party_code_normalized="9999", customer_name="X",
    )
    key = stock_doc_identity(doc, {})
    assert key.split(chr(31)) == ["1001", "Retail", "Mumbai", "Acme", "9999", "", "", "X"]


def test_apply_pivot_exclusions_drops_all_ship_to_splits_and_recomputes() -> None:
    rows = [
        _pivot_row("ACME STEEL", 10.0),   # identity I_A
        _pivot_row("OTHER CORP", 5.0),    # identity I_B (different customer_name)
        _pivot_row("ACME STEEL", 3.0),    # same identity as the first (ship-to split)
    ]
    report = ReportResponse(
        date="01-06-2026", report_type="jsw", region_id=None, region_name="All Regions",
        days_filter="include", ccas=["VJ0H"], has_stock=True, has_credit_report=False,
        coil_price_per_qty=None, rake_columns=["KKU"], rows=rows,
        grand_total=18.0, grand_nco_yes_do=0.0, grand_required_credit=None,
        rake_totals={"KKU": 18.0}, transport_mode_totals={"ROAD": 18.0},
    )

    excluded = {row_identity(rows[0])}  # exclude ACME STEEL
    apply_pivot_exclusions(report, excluded)

    assert [r.customer_name for r in report.rows] == ["OTHER CORP"]  # both ACME rows gone
    assert report.grand_total == 5.0
    assert report.rake_totals == {"KKU": 5.0}
    assert report.transport_mode_totals == {"ROAD": 5.0}


def test_apply_pivot_exclusions_empty_is_noop() -> None:
    rows = [_pivot_row("ACME STEEL", 10.0)]
    report = ReportResponse(
        date="01-06-2026", report_type="jsw", region_id=None, region_name="All Regions",
        days_filter="include", ccas=["VJ0H"], has_stock=True, has_credit_report=False,
        coil_price_per_qty=None, rake_columns=["KKU"], rows=rows,
        grand_total=10.0, grand_nco_yes_do=0.0, grand_required_credit=None,
        rake_totals={"KKU": 10.0}, transport_mode_totals={"ROAD": 10.0},
    )
    apply_pivot_exclusions(report, set())
    assert len(report.rows) == 1 and report.grand_total == 10.0


def test_filter_stock_docs_drops_excluded_identity() -> None:
    keep = SimpleNamespace(
        so_sales_org="1001", distr_chnl="Retail", sales_office="Mumbai",
        sold_to_party="Acme", party_code_normalized="4012", customer_name="KEEP",
    )
    drop = SimpleNamespace(
        so_sales_org="1001", distr_chnl="Retail", sales_office="Mumbai",
        sold_to_party="Acme", party_code_normalized="4012", customer_name="DROP",
    )
    first_doc = {"4012": SimpleNamespace(transport_mode="ROAD", destination="Pune")}
    keys = {stock_doc_identity(drop, first_doc)}

    out = filter_stock_docs([keep, drop], first_doc, keys)
    assert [d.customer_name for d in out] == ["KEEP"]


def test_excluded_key_union_flattens_all_rakes() -> None:
    body = CombinedExportBody(
        exclusions={
            "KKU": RakeExclusion(keys=["a", "b"], subtract=1.0),
            "ROAD": RakeExclusion(keys=["b", "c"], subtract=2.0),
        }
    )
    assert excluded_key_union(body) == {"a", "b", "c"}
    assert excluded_key_union(None) == set()


def test_build_pivot_row_identity_matches_stock_doc() -> None:
    """The keystone: a pivot row built from an aggregation `_id` (incl. customer_name)
    yields the SAME `row_identity` as the same party's `stock_doc_identity` — so the
    on-screen/export pivot trim matches the drill-down exclusion key."""
    party = "4012"
    cc = SimpleNamespace(code="004012", rake="KKU", transport_mode="ROAD",
                         destination="Pune", route=None)
    agg = {
        "_id": {"so_sales_org": "1001", "distr_chnl": "Retail", "sold_to_party": "Acme",
                "sales_office": "Mumbai", "party": party, "ship_to_party": "ST",
                "customer_name": "ACME STEEL"},
        "total": 10.0, "nco_yes_do": 0.0, "nco_yes_do_count": 0,
    }
    pivot_rows = _build_pivot_rows([agg], False, {}, None, {party: cc}, ["KKU"])
    doc = SimpleNamespace(so_sales_org="1001", distr_chnl="Retail", sales_office="Mumbai",
                          sold_to_party="Acme", party_code_normalized=party, customer_name="ACME STEEL")

    assert pivot_rows[0].customer_name == "ACME STEEL"
    assert row_identity(pivot_rows[0]) == stock_doc_identity(doc, {party: cc})

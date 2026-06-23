"""Pure-unit tests for credit_report ingestion gate and query filters.

No network, no MongoDB, no async.  Verifies the CCA whitelist and the
plant-level grouping filter.
"""

from __future__ import annotations

import pytest

from app.schemas.credit_report import CreditReportListQuery
from app.utils.credit_report.filters import should_keep_row
from app.utils.credit_report.query import build_credit_report_filter


# ---------------------------------------------------------------------------
# Ingestion gate
# ---------------------------------------------------------------------------

@pytest.mark.parametrize(
    "cca,expected",
    [
        ("JV0H", True),
        ("VJ0H", True),
        ("1000", True),
        ("jv0h", True),   # case-insensitive
        ("vj0h", True),
        ("1000", True),
        ("1234", False),
        ("", False),
        (None, False),
    ],
)
def test_should_keep_row_allows_only_whitelisted_ccas(cca: str | None, expected: bool) -> None:
    row = {"customer_name": "Acme Steel", "credit_control_area": cca}
    assert should_keep_row(row) is expected


def test_should_keep_row_rejects_empty_customer_name() -> None:
    row = {"customer_name": "", "credit_control_area": "VJ0H"}
    assert should_keep_row(row) is False


def test_should_keep_row_rejects_whitespace_customer_name() -> None:
    row = {"customer_name": "   ", "credit_control_area": "1000"}
    assert should_keep_row(row) is False


# ---------------------------------------------------------------------------
# Plant filter
# ---------------------------------------------------------------------------

def test_filter_jsw_maps_to_vj0h_and_1000() -> None:
    query = CreditReportListQuery(plant="jsw")
    filt = build_credit_report_filter(query)
    assert filt == {"credit_control_area": {"$in": ["VJ0H", "1000"]}}


def test_filter_jvml_maps_to_jv0h() -> None:
    query = CreditReportListQuery(plant="jvml")
    filt = build_credit_report_filter(query)
    assert filt == {"credit_control_area": {"$in": ["JV0H"]}}


def test_filter_all_adds_no_cca_predicate() -> None:
    query = CreditReportListQuery(plant="all")
    filt = build_credit_report_filter(query)
    assert "credit_control_area" not in filt


def test_plant_filter_combines_with_date() -> None:
    query = CreditReportListQuery(plant="jsw", date="20-06-2026")
    filt = build_credit_report_filter(query)
    assert filt == {
        "report_date": "20-06-2026",
        "credit_control_area": {"$in": ["VJ0H", "1000"]},
    }


def test_plant_filter_combines_with_blocked() -> None:
    query = CreditReportListQuery(plant="jvml", blocked="blocked")
    filt = build_credit_report_filter(query)
    assert filt == {
        "blocked": "X",
        "credit_control_area": {"$in": ["JV0H"]},
    }


def test_default_plant_is_all() -> None:
    query = CreditReportListQuery()
    assert query.plant == "all"

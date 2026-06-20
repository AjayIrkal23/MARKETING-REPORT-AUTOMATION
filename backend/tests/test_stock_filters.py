"""Ingestion-gate unit tests — the usage_decision NCO/COMMERCIAL denylist (gate 6).

Covers both jsw_stock and jvml_stock `should_keep_row` (identical logic). The
gate drops rows whose Usage Decision is NCO or COMMERCIAL (case-insensitive);
every other value (ACCEPT/PRIME/blank/None) is kept, assuming the other 5 gates
pass.
"""

from __future__ import annotations

import pytest

from app.utils.jsw_stock.filters import should_keep_row as jsw_should_keep_row
from app.utils.jvml_stock.filters import should_keep_row as jvml_should_keep_row

_PCODE = "8662"
_CUSTOMER_MAP = {_PCODE: ("ACME STEELS", "code-id-1")}


def _row(usage_decision: str | None) -> dict:
    """A coerced row that passes every gate EXCEPT possibly the usage one."""
    return {
        "so_product_form": "S_HRCF",
        "blocked": 0,
        "sales_order_type": "ZOR",      # not in the deny set, not ZRE<number>
        "nco_declared": "No",
        "do_no": None,
        "usage_decision": usage_decision,
    }


GATES = (jsw_should_keep_row, jvml_should_keep_row)


@pytest.mark.parametrize("keep_row", GATES)
def test_baseline_row_is_kept(keep_row) -> None:
    assert keep_row(_row("ACCEPT"), _PCODE, _CUSTOMER_MAP) is True


@pytest.mark.parametrize("keep_row", GATES)
@pytest.mark.parametrize("value", ["NCO", "nco", " Nco ", "COMMERCIAL", "commercial", " Commercial "])
def test_nco_and_commercial_are_dropped(keep_row, value) -> None:
    assert keep_row(_row(value), _PCODE, _CUSTOMER_MAP) is False


@pytest.mark.parametrize("keep_row", GATES)
@pytest.mark.parametrize("value", ["ACCEPT", "ACCEPTED", "PRIME", "", None])
def test_other_usage_decisions_are_kept(keep_row, value) -> None:
    assert keep_row(_row(value), _PCODE, _CUSTOMER_MAP) is True


@pytest.mark.parametrize("keep_row", GATES)
def test_unmatched_party_code_still_rejected(keep_row) -> None:
    # Sanity: gate 1 (party-code match) still fires regardless of usage_decision.
    assert keep_row(_row("ACCEPT"), "99999", _CUSTOMER_MAP) is False

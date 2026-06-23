"""Pure-unit tests for credit_report value coercion.

No network, no MongoDB, no async.  Verifies that date columns tolerate
out-of-range Excel serials and open-ended sentinel dates without raising.
"""

from __future__ import annotations

from datetime import datetime

import pytest

from app.utils.credit_report.columns import coerce_value


@pytest.mark.parametrize(
    "field,raw,expected",
    [
        # Normal Excel serial dates are converted.
        ("validity_period_start", 41306.0, datetime(2013, 2, 1)),
        ("validity_period_end", 45382.0, datetime(2024, 3, 31)),
        # ISO text dates work.
        ("validity_period_start", "2024-03-31", datetime(2024, 3, 31)),
        # dd.mm.yyyy text dates work.
        ("validity_period_end", "31.03.2024", datetime(2024, 3, 31)),
    ],
)
def test_coerce_date_parses_valid_values(
    field: str, raw: object, expected: datetime
) -> None:
    assert coerce_value(field, raw) == expected


@pytest.mark.parametrize(
    "field,raw",
    [
        # Open-ended sentinel 9999-12-31 is dropped — not used by the UI and
        # breaks timezone conversion on some platforms.
        ("validity_period_end", 2958465.0),
        # Out-of-range serials are dropped.
        ("validity_period_end", -693595.0),
        ("validity_period_end", 9_999_999.0),
        # Year 9999 as an ISO string is also dropped.
        ("validity_period_end", "9999-12-31"),
        # Non-date strings are dropped.
        ("validity_period_start", "not a date"),
        ("validity_period_start", ""),
        # Empty/None is dropped.
        ("validity_period_start", None),
    ],
)
def test_coerce_date_returns_none_for_unusable_values(field: str, raw: object) -> None:
    assert coerce_value(field, raw) is None

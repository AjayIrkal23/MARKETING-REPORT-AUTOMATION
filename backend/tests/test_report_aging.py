"""Unit tests for the report QA-hold aging day-filter clause (`qa_hold_match`).

Rule (2026-06): the filter is defined around "aged QA-hold" stock =
in_quality_insp > 0 AND round(aging) > 2 (aging rounded to whole days).
  include → no filter (all stock)
  exclude → everything EXCEPT aged QA-hold (all normal data + QA-hold ≤ 2 days)
  only    → ONLY aged QA-hold
include is the union of exclude and only.
"""

from __future__ import annotations

from app.services.report.pivot import qa_hold_match

_AGED_QA_HOLD = {
    "$and": [
        {"$gt": ["$in_quality_insp", 0]},
        {"$gt": [{"$round": ["$aging", 0]}, 2]},
    ]
}


def test_include_has_no_filter() -> None:
    assert qa_hold_match("include") == {}


def test_exclude_keeps_everything_except_aged_qa_hold() -> None:
    assert qa_hold_match("exclude") == {"$expr": {"$not": [_AGED_QA_HOLD]}}


def test_only_keeps_aged_qa_hold() -> None:
    assert qa_hold_match("only") == {"$expr": _AGED_QA_HOLD}


def test_unknown_value_defaults_to_no_filter() -> None:
    assert qa_hold_match("anything-else") == {}

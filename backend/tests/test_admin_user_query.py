"""Admin user query helpers — filter escaping, status/role filters, sort tokens.

Pure-function unit tests; no TestClient, no MongoDB.
Contract: §3.7 / §3.9 of USER-MANAGEMENT-PLAN.md (build_admin_filter + build_sort).
Mirrors the style of ``test_user_query.py``.
"""

from __future__ import annotations

import re

import pytest
from pydantic import ValidationError

from app.schemas.admin_user import AdminUserListQuery
from app.utils.admin_user.query import build_admin_filter, build_sort


# ---------------------------------------------------------------------------
# build_admin_filter — empty / no-op cases
# ---------------------------------------------------------------------------


def test_filter_empty_when_defaults() -> None:
    """Defaults (no q, status='all', role='all') produce an empty filter."""
    assert build_admin_filter(AdminUserListQuery()) == {}


def test_filter_empty_when_q_is_none_and_all_filters() -> None:
    """Explicit None q with all-sentinel filters still produces an empty filter."""
    query = AdminUserListQuery(q=None, status="all", role="all")
    assert build_admin_filter(query) == {}


# ---------------------------------------------------------------------------
# build_admin_filter — free-text q escaping (ReDoS / OWASP A05 guard)
# ---------------------------------------------------------------------------


def test_filter_q_escapes_regex_metacharacters() -> None:
    """re.escape must be applied to q before it becomes a $regex value."""
    q = "a.*+b(c|d)"
    filt = build_admin_filter(AdminUserListQuery(q=q))
    escaped = re.escape(q)
    # $or across name + emailid
    assert "$or" in filt
    for branch in filt["$or"]:
        assert list(branch.values())[0]["$regex"] == escaped
        assert list(branch.values())[0]["$options"] == "i"


def test_filter_q_matches_name_and_emailid() -> None:
    """Free-text q must produce an $or branch for both 'name' and 'emailid'."""
    filt = build_admin_filter(AdminUserListQuery(q="alice"))
    assert "$or" in filt
    fields = [list(branch.keys())[0] for branch in filt["$or"]]
    assert "name" in fields
    assert "emailid" in fields


def test_filter_q_is_case_insensitive() -> None:
    """The regex must carry the 'i' option for case-insensitive matching."""
    filt = build_admin_filter(AdminUserListQuery(q="JSW"))
    for branch in filt["$or"]:
        assert list(branch.values())[0]["$options"] == "i"


def test_filter_q_escapes_dot() -> None:
    """A bare dot is a regex wildcard; re.escape must neutralise it."""
    filt = build_admin_filter(AdminUserListQuery(q="3.14"))
    for branch in filt["$or"]:
        assert list(branch.values())[0]["$regex"] == re.escape("3.14")


def test_filter_q_length_is_capped() -> None:
    """Strings longer than 100 chars must be rejected by the schema (DoS guard)."""
    with pytest.raises(ValidationError):
        AdminUserListQuery(q="x" * 101)


# ---------------------------------------------------------------------------
# build_admin_filter — status filter
# ---------------------------------------------------------------------------


def test_filter_status_invited() -> None:
    filt = build_admin_filter(AdminUserListQuery(status="invited"))
    assert filt.get("status") == "invited"


def test_filter_status_active() -> None:
    filt = build_admin_filter(AdminUserListQuery(status="active"))
    assert filt.get("status") == "active"


def test_filter_status_disabled() -> None:
    filt = build_admin_filter(AdminUserListQuery(status="disabled"))
    assert filt.get("status") == "disabled"


def test_filter_status_all_not_in_filter() -> None:
    """The 'all' sentinel must NOT add a 'status' key to the filter document."""
    filt = build_admin_filter(AdminUserListQuery(status="all"))
    assert "status" not in filt


def test_filter_unknown_status_rejected() -> None:
    """Values outside the Literal whitelist must be rejected by Pydantic."""
    with pytest.raises(ValidationError):
        AdminUserListQuery(status="suspended")  # type: ignore[arg-type]


# ---------------------------------------------------------------------------
# build_admin_filter — role filter
# ---------------------------------------------------------------------------


def test_filter_role_admin_maps_to_is_admin_true() -> None:
    """role='admin' must add isAdmin=True to the filter (not the string 'admin')."""
    filt = build_admin_filter(AdminUserListQuery(role="admin"))
    assert filt.get("isAdmin") is True


def test_filter_role_user_maps_to_is_admin_false() -> None:
    """role='user' must add isAdmin=False (not the string 'user')."""
    filt = build_admin_filter(AdminUserListQuery(role="user"))
    assert filt.get("isAdmin") is False


def test_filter_role_all_not_in_filter() -> None:
    """The 'all' sentinel must NOT add an 'isAdmin' key to the filter document."""
    filt = build_admin_filter(AdminUserListQuery(role="all"))
    assert "isAdmin" not in filt


def test_filter_unknown_role_rejected() -> None:
    with pytest.raises(ValidationError):
        AdminUserListQuery(role="superuser")  # type: ignore[arg-type]


# ---------------------------------------------------------------------------
# build_admin_filter — combined status + role + q
# ---------------------------------------------------------------------------


def test_filter_status_and_role_combined() -> None:
    """Both status and role can be applied simultaneously."""
    filt = build_admin_filter(AdminUserListQuery(status="active", role="admin"))
    assert filt.get("status") == "active"
    assert filt.get("isAdmin") is True


def test_filter_q_with_status_and_role() -> None:
    """q, status, and role can all be applied in a single filter."""
    filt = build_admin_filter(
        AdminUserListQuery(q="bob", status="disabled", role="user")
    )
    assert "$or" in filt
    assert filt.get("status") == "disabled"
    assert filt.get("isAdmin") is False


# ---------------------------------------------------------------------------
# build_sort — sort token format
# ---------------------------------------------------------------------------


def test_sort_asc_produces_plus_prefix() -> None:
    assert build_sort("name", "asc") == "+name"


def test_sort_desc_produces_minus_prefix() -> None:
    assert build_sort("name", "desc") == "-name"


def test_sort_all_whitelisted_fields_asc() -> None:
    """Every field in AdminUserSortBy must produce a valid '+field' token."""
    fields = ["name", "emailid", "status", "isAdmin", "lastlogined", "createdAt"]
    for field in fields:
        token = build_sort(field, "asc")
        assert token == f"+{field}"


def test_sort_all_whitelisted_fields_desc() -> None:
    """Every field in AdminUserSortBy must produce a valid '-field' token."""
    fields = ["name", "emailid", "status", "isAdmin", "lastlogined", "createdAt"]
    for field in fields:
        token = build_sort(field, "desc")
        assert token == f"-{field}"


def test_sort_default_sort_by_is_created_at() -> None:
    """Default sortBy must be 'createdAt' per the schema contract (§3.7)."""
    query = AdminUserListQuery()
    assert query.sortBy == "createdAt"


def test_sort_default_sort_order_is_desc() -> None:
    """Default sortOrder must be 'desc' (newest first) per the schema contract."""
    query = AdminUserListQuery()
    assert query.sortOrder == "desc"


def test_sort_unknown_key_rejected_by_schema() -> None:
    """A sort key not in the Literal whitelist must be rejected by Pydantic."""
    with pytest.raises(ValidationError):
        AdminUserListQuery(sortBy="password")  # type: ignore[arg-type]


def test_sort_token_emailid_asc() -> None:
    assert build_sort("emailid", "asc") == "+emailid"


def test_sort_token_lastlogined_desc() -> None:
    assert build_sort("lastlogined", "desc") == "-lastlogined"

"""User list query helpers — ReDoS-safe filter + sort tokens."""

from __future__ import annotations

import re

import pytest
from pydantic import ValidationError

from app.schemas.user import UserListQuery
from app.utils.user.query import build_sort, build_user_filter


def test_filter_empty_when_no_search() -> None:
    assert build_user_filter(UserListQuery()) == {}


def test_filter_escapes_regex_metacharacters() -> None:
    # Raw `q` must be re.escape'd before becoming a $regex (ReDoS / injection guard).
    q = "a.*+b(c|d)"
    filt = build_user_filter(UserListQuery(q=q))
    assert filt["emailid"]["$regex"] == re.escape(q)
    assert filt["emailid"]["$options"] == "i"


def test_search_length_is_capped() -> None:
    with pytest.raises(ValidationError):
        UserListQuery(q="x" * 101)  # max_length=100


def test_sort_tokens() -> None:
    assert build_sort("emailid", "asc") == "+emailid"
    assert build_sort("lastlogined", "desc") == "-lastlogined"


def test_unknown_sort_key_rejected() -> None:
    with pytest.raises(ValidationError):
        UserListQuery(sortBy="password")  # not in the Literal whitelist


def test_login_password_length_capped() -> None:
    from app.schemas.auth import LoginRequest

    with pytest.raises(ValidationError):
        LoginRequest(emailid="a@b.com", password="x" * 129)  # max_length=128

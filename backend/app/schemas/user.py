"""User-domain request/response DTOs."""

from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, EmailStr, Field

from .common import PageQuery

# Whitelisted sort keys for the users list (fields that actually exist on User).
UserSortBy = Literal["emailid", "lastlogined", "isAdmin"]


class UserListQuery(PageQuery):
    """Query params for ``GET /users`` — sort keys are whitelisted."""

    sortBy: UserSortBy = "emailid"
    # Ascending by default: a user list reads best alphabetically by email.
    # This intentionally overrides the PageQuery `desc` default (which suits
    # time-ordered lists).
    sortOrder: Literal["asc", "desc"] = "asc"
    # Optional case-insensitive email search; length-capped to bound the regex.
    q: str | None = Field(default=None, max_length=100)


class UserPublic(BaseModel):
    """Client-safe user projection (no password hash)."""

    emailid: EmailStr
    isAdmin: bool
    lastlogined: datetime | None = None

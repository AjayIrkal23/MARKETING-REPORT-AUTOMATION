"""User-domain request/response DTOs."""

from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, EmailStr

from .common import PageQuery

# Whitelisted sort keys for the users list (fields that actually exist on User).
UserSortBy = Literal["emailid", "lastlogined", "isAdmin"]


class UserListQuery(PageQuery):
    """Query params for ``GET /users`` — sort keys are whitelisted."""

    sortBy: UserSortBy = "emailid"
    sortOrder: Literal["asc", "desc"] = "asc"
    q: str | None = None  # optional case-insensitive email search


class UserPublic(BaseModel):
    """Client-safe user projection (no password hash)."""

    emailid: EmailStr
    isAdmin: bool
    lastlogined: datetime | None = None

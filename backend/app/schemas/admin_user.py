"""Admin user-management request/response DTOs.

Contract: §3.7 of USER-MANAGEMENT-PLAN.md.
All list/sort/filter logic here must match the Beanie query builders in
``utils/admin_user/query.py`` — keep field names in sync.
"""

from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING, Literal

from pydantic import BaseModel, EmailStr, Field

from .common import PageQuery

if TYPE_CHECKING:
    # Avoid a hard import cycle at runtime; used only for the type hint in
    # ``to_admin_user_public`` which is called from services, not on import.
    from app.models.user import User

# ---------------------------------------------------------------------------
# Shared type aliases (match the User model's Literal exactly)
# ---------------------------------------------------------------------------

UserStatusT = Literal["invited", "active", "disabled"]
AdminUserSortBy = Literal[
    "name",
    "emailid",
    "status",
    "isAdmin",
    "lastlogined",
    "createdAt",
]


# ---------------------------------------------------------------------------
# Response DTO
# ---------------------------------------------------------------------------


class AdminUserPublic(BaseModel):
    """Client-safe admin projection of a User document.

    ``id`` is the MongoDB ObjectId serialised to a plain string so the frontend
    never touches ObjectId logic.  ``password`` / ``otp_*`` fields are never
    included (security-and-hardening).
    """

    id: str
    name: str | None
    emailid: EmailStr
    isAdmin: bool
    status: UserStatusT
    lastlogined: datetime | None
    createdAt: datetime


# ---------------------------------------------------------------------------
# Query / list DTOs
# ---------------------------------------------------------------------------


class AdminUserListQuery(PageQuery):
    """Query params for ``GET /admin/users``.

    Extends ``PageQuery`` (page, limit, sortOrder).  Sort keys are a Pydantic
    ``Literal`` whitelist so unknown values are rejected at parse time
    (backend-api-standards).
    """

    sortBy: AdminUserSortBy = "createdAt"
    # Override the PageQuery default (already "desc") — explicit for clarity.
    sortOrder: Literal["asc", "desc"] = "desc"
    # Optional free-text search over name + email; length-capped to bound the regex.
    q: str | None = Field(default=None, max_length=100)
    # Filter by account lifecycle status; "all" = no filter applied.
    status: Literal["invited", "active", "disabled", "all"] = "all"
    # Filter by role; "all" = no filter applied.
    role: Literal["admin", "user", "all"] = "all"


# ---------------------------------------------------------------------------
# Mutation DTOs
# ---------------------------------------------------------------------------


class CreateUserRequest(BaseModel):
    """Body for ``POST /admin/users``.

    Email is the immutable login key (cannot be changed after creation).
    Password is intentionally absent — the account starts as ``invited`` and
    the user sets their password via OTP first-login.
    """

    name: str = Field(min_length=1, max_length=120)
    emailid: EmailStr
    isAdmin: bool = False


class UpdateUserRequest(BaseModel):
    """Body for ``PATCH /admin/users/{id}``.

    Email is NOT editable (it is the stable login key — §2 of the plan).
    Both fields are optional so a partial update is valid.
    """

    name: str | None = Field(default=None, min_length=1, max_length=120)
    isAdmin: bool | None = None


class ResetPasswordRequest(BaseModel):
    """Body for ``POST /admin/users/{id}/reset-password``.

    ``newPassword`` is optional (§2 of the plan):
    - Provided → hash + store, set status to ``active``.
    - Omitted → null the password, set status to ``invited`` (forces OTP re-setup).
    """

    newPassword: str | None = Field(default=None, min_length=8, max_length=128)


# ---------------------------------------------------------------------------
# Async options DTOs (backend-driven select / combobox — §1.4 / §4.6)
# ---------------------------------------------------------------------------


class AsyncOption(BaseModel):
    """Single option entry for the backend-driven async combobox.

    ``sublabel`` carries secondary display text (e.g. email when label is name).
    """

    value: str
    label: str
    sublabel: str | None = None


class UserOptionsQuery(BaseModel):
    """Query params for ``GET /admin/users/options``.

    Hard-caps at 200 per the frontend combobox contract (§3.8 / §4.6).
    """

    q: str | None = Field(default=None, max_length=100)
    limit: int = Field(default=50, ge=1, le=200)


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------


def to_admin_user_public(user: "User") -> AdminUserPublic:
    """Map a Beanie ``User`` document to an ``AdminUserPublic`` DTO.

    ``id`` is cast via ``str(user.id)`` so the ObjectId never leaks to the
    caller (contract §3.7: ``id=str(user.id)``).
    """
    return AdminUserPublic(
        id=str(user.id),
        name=user.name,
        emailid=user.emailid,
        isAdmin=user.isAdmin,
        status=user.status,
        lastlogined=user.lastlogined,
        createdAt=user.createdAt,
    )

"""Auth-domain request/response DTOs."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class LoginRequest(BaseModel):
    """Validated login payload."""

    emailid: EmailStr
    password: str = Field(min_length=1)


class AuthUser(BaseModel):
    """Client-safe user projection returned on successful login.

    Never includes the password hash.
    """

    emailid: EmailStr
    isAdmin: bool
    lastlogined: datetime | None = None

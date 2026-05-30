"""User document model (MongoDB collection ``users``, via Beanie)."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Annotated, Literal

from beanie import Document, Indexed
from pydantic import EmailStr, Field


class User(Document):
    """An application user.

    ``password`` stores a **bcrypt hash** — never plaintext (see ``app.security``).
    When ``password`` is ``None`` the account is in the invited/setup state; the
    user must complete OTP setup before they can log in normally.
    ``emailid`` is uniquely indexed and used as the natural login key.
    """

    emailid: Annotated[EmailStr, Indexed(unique=True)]
    name: str | None = None
    password: str | None = None  # bcrypt hash; None until OTP setup completes
    status: Literal["invited", "active", "disabled"] = "invited"
    isAdmin: bool = False
    lastlogined: datetime | None = None
    createdAt: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )

    # OTP first-login setup fields
    otp_hash: str | None = None
    otp_expires_at: datetime | None = None
    otp_attempts: int = 0
    otp_last_sent_at: datetime | None = None

    class Settings:
        name = "users"

"""User document model (MongoDB collection ``users``, via Beanie)."""

from __future__ import annotations

from datetime import datetime
from typing import Annotated

from beanie import Document, Indexed
from pydantic import EmailStr


class User(Document):
    """An application user.

    ``password`` stores a **bcrypt hash** — never plaintext (see ``app.security``).
    ``emailid`` is uniquely indexed and used as the natural login key.
    """

    emailid: Annotated[EmailStr, Indexed(unique=True)]
    password: str
    lastlogined: datetime | None = None
    isAdmin: bool = False

    class Settings:
        name = "users"

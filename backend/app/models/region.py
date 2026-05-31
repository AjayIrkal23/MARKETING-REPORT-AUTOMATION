"""Region document model (MongoDB collection ``regions``, via Beanie)."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Annotated

from beanie import Document, Indexed
from pydantic import Field


def _now_utc() -> datetime:
    """Return the current UTC datetime (used as a :func:`~pydantic.Field` default factory)."""
    return datetime.now(timezone.utc)


class Region(Document):
    """A notification / distribution group.

    A Region groups a set of recipient email addresses under a named label.
    Mutations are tracked via the ``regions`` audit category.

    ``name`` uniqueness is enforced at the service layer via a case-insensitive
    regex query rather than a unique MongoDB index, consistent with how the
    application manages other uniqueness constraints.
    """

    name:       Annotated[str, Indexed()]
    emails:     list[str] = Field(default_factory=list)
    active:     Annotated[bool, Indexed()] = True
    created_at: Annotated[datetime, Indexed()] = Field(default_factory=_now_utc)
    updated_at: datetime = Field(default_factory=_now_utc)

    class Settings:
        name = "regions"

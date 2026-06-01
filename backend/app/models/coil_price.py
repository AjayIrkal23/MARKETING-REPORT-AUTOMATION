"""CoilPrice document model (MongoDB collection ``coil_prices``, via Beanie)."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Annotated

from beanie import Document, Indexed
from pydantic import Field


def _now_utc() -> datetime:
    """Return the current UTC datetime (used as a :func:`~pydantic.Field` default factory)."""
    return datetime.now(timezone.utc)


class CoilPrice(Document):
    """A per-quantity coil price entry.

    Holds the price for a given coil quantity (the "Per Coil Price" admin
    section). ``quantity`` is unique across entries — one price per quantity —
    enforced at the service layer via an exact-match query rather than a unique
    MongoDB index, consistent with how the application manages other uniqueness
    constraints (see ``Region.name``).

    Mutations are tracked via the ``coil_config`` audit category.
    """

    quantity:   Annotated[float, Indexed()]
    price:      float
    active:     Annotated[bool, Indexed()] = True
    created_at: Annotated[datetime, Indexed()] = Field(default_factory=_now_utc)
    updated_at: datetime = Field(default_factory=_now_utc)

    class Settings:
        name = "coil_prices"

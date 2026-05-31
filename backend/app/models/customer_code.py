"""CustomerCode document model (MongoDB collection ``customer_codes``, via Beanie)."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Annotated

from beanie import Document, Indexed
from pydantic import Field


def _now_utc() -> datetime:
    """Return the current UTC datetime (used as a :func:`~pydantic.Field` default factory)."""
    return datetime.now(timezone.utc)


class CustomerCode(Document):
    """A SAP customer code entry linked to a Region.

    Each row maps a customer (identified by their SAP ``code``) to a regional
    assignment (``region_id`` → ``regions`` collection ObjectId as hex string).
    ``code`` is **not** unique — the same SAP customer code may appear across
    multiple ship-to rows, so the service layer applies no uniqueness check.

    Values are stored as entered from the source Excel sheet; casing is not
    normalised.  Mutations are tracked via the ``customer_codes`` audit category.
    """

    segment:          Annotated[str, Indexed()]
    """Market segment, e.g. ``Retail``, ``oem``, ``Stock transfer`` — stored as-is."""

    code:             Annotated[str, Indexed()]
    """SAP customer code (numeric in Excel, e.g. ``40020365``, ``8451``); stored as a
    trimmed string.  **Not unique** — the same code may appear across multiple ship-to rows."""

    customer:         Annotated[str, Indexed()]
    """Customer / company name."""

    destination:      Annotated[str, Indexed()]
    """Destination city."""

    cam:              str | None = None
    """Account manager (``CAM`` column, trailing space stripped on ingest)."""

    mob:              str | None = None
    """Mobile number (``MOB No.`` column); numeric cells coerced to string on ingest."""

    head:             str | None = None
    """Sales head."""

    route:            str | None = None
    """Route code, e.g. ``KAT036``."""

    ship_to:          str | None = None
    """Ship-to code (``SHIP TO`` column); numeric cells coerced to string on ingest."""

    ship_to_customer: str | None = None
    """Ship-to customer name (``SHIP TO CUSTOMER`` column)."""

    region_id:        Annotated[str, Indexed()]
    """Foreign key — ObjectId hex string of the parent :class:`~app.models.region.Region`
    document.  Validated to be a real Region at the service layer before insert/update."""

    created_at: Annotated[datetime, Indexed()] = Field(default_factory=_now_utc)
    """UTC timestamp set once at document creation."""

    updated_at: datetime = Field(default_factory=_now_utc)
    """UTC timestamp bumped manually on every :func:`update_customer_code` call."""

    class Settings:
        name = "customer_codes"

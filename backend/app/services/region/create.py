"""Region service: create a new region with case-insensitive name uniqueness.

Business rules (contract .planning/regions/SPEC.md §1.4 / ADDENDUM §services/region/create.py):
- Name must be unique across regions (case-insensitive regex anchor).
- Raises ``ConflictError`` if a region with the same name (any case) already exists.
- ``created_at`` and ``updated_at`` are both set to the same ``_now_utc()`` timestamp at insert.
- Emits a ``regions`` audit event (``region.created``) after insert; audit failure must
  NOT abort the successfully-persisted record (``record_audit`` in events.py never raises).
- Returns a ``RegionPublic`` DTO — never the raw Beanie document.
"""

from __future__ import annotations

import re

from ...core.errors import ConflictError
from ...models.region import Region, _now_utc
from ...schemas.region import RegionCreate, RegionPublic
from ..audit.events import audit_region_event
from .serialize import to_public


async def create_region(data: RegionCreate, actor_email: str | None) -> RegionPublic:
    """Create a new region and emit an audit event.

    Args:
        data:        Validated ``RegionCreate`` DTO (name, emails, active).
        actor_email: Admin actor email threaded from ``admin.emailid``; ``None`` if unavailable.

    Returns:
        The persisted region as a ``RegionPublic`` DTO.

    Raises:
        ConflictError: If a region with the same name already exists (case-insensitive).
    """
    existing = await Region.find_one(
        {"name": {"$regex": f"^{re.escape(data.name)}$", "$options": "i"}}
    )
    if existing is not None:
        raise ConflictError("A region with this name already exists.")

    now = _now_utc()
    doc = Region(
        name=data.name,
        emails=list(data.emails),   # EmailStr list → plain str list for model storage
        active=data.active,
        created_at=now,
        updated_at=now,
    )
    await doc.insert()

    await audit_region_event(
        "region.created",
        f"Created region '{doc.name}'",
        actor_email=actor_email,
        extra={
            "region_id": str(doc.id),
            "active": doc.active,
            "recipient_count": len(doc.emails),
        },
    )
    return to_public(doc)

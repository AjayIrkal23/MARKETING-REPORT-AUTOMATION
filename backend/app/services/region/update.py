from __future__ import annotations

import re

from beanie import PydanticObjectId

from ...core.errors import ConflictError, NotFoundError
from ...models.region import Region, _now_utc
from ...schemas.region import RegionPublic, RegionUpdate
from ..audit.events import audit_region_event
from .serialize import to_public


async def update_region(
    region_id: str, data: RegionUpdate, actor_email: str | None
) -> RegionPublic:
    try:
        oid = PydanticObjectId(region_id)
    except Exception:
        raise NotFoundError("Region not found.")

    doc: Region | None = await Region.get(oid)
    if doc is None:
        raise NotFoundError("Region not found.")

    changed: list[str] = []
    update_data = data.model_dump(exclude_unset=True)

    if "name" in update_data:
        new_name = update_data["name"]
        existing = await Region.find_one({
            "name": {"$regex": f"^{re.escape(new_name)}$", "$options": "i"},
            "_id": {"$ne": oid},
        })
        if existing is not None:
            raise ConflictError("A region with this name already exists.")
        doc.name = new_name
        changed.append("name")

    if "emails" in update_data:
        doc.emails = update_data["emails"]
        changed.append("emails")

    if "active" in update_data:
        doc.active = update_data["active"]
        changed.append("active")

    doc.updated_at = _now_utc()
    await doc.save()

    await audit_region_event(
        "region.updated",
        f"Updated region '{doc.name}'",
        actor_email=actor_email,
        extra={"region_id": str(doc.id), "changed": changed},
    )
    return to_public(doc)

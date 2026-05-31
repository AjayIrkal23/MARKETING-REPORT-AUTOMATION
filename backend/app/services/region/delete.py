"""Region service: delete a region document."""

from __future__ import annotations

from beanie import PydanticObjectId

from ...core.errors import NotFoundError
from ...models.region import Region
from ..audit.events import audit_region_event


async def delete_region(region_id: str, actor_email: str | None) -> None:
    """Delete a region by id and emit a ``region.deleted`` audit event.

    Args:
        region_id:   String representation of the MongoDB ObjectId.
        actor_email: Admin actor email threaded from ``admin.emailid``; ``None`` if unavailable.

    Returns:
        ``None`` on success.

    Raises:
        NotFoundError: If the id is invalid or no region with the given id exists.
    """
    try:
        oid = PydanticObjectId(region_id)
    except Exception:
        raise NotFoundError("Region not found.")

    doc: Region | None = await Region.get(oid)
    if doc is None:
        raise NotFoundError("Region not found.")

    name = doc.name  # capture before delete
    await doc.delete()

    await audit_region_event(
        "region.deleted",
        f"Deleted region '{name}'",
        actor_email=actor_email,
        extra={"region_id": region_id, "name": name},
    )

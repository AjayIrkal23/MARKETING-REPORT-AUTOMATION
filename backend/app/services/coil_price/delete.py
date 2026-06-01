"""Coil price service: delete a coil price document."""

from __future__ import annotations

from beanie import PydanticObjectId

from ...core.errors import NotFoundError
from ...models.coil_price import CoilPrice
from ..audit.events import audit_coil_config_event


async def delete_coil_price(coil_price_id: str, actor_email: str | None) -> None:
    """Delete a coil price by id and emit a ``coil_price.deleted`` audit event.

    Raises:
        NotFoundError: If the id is invalid or no coil price with the given id exists.
    """
    try:
        oid = PydanticObjectId(coil_price_id)
    except Exception:
        raise NotFoundError("Coil price not found.")

    doc: CoilPrice | None = await CoilPrice.get(oid)
    if doc is None:
        raise NotFoundError("Coil price not found.")

    quantity = doc.quantity  # capture before delete
    await doc.delete()

    await audit_coil_config_event(
        "coil_price.deleted",
        f"Deleted coil price for quantity {quantity}",
        actor_email=actor_email,
        extra={"coil_price_id": coil_price_id, "quantity": quantity},
    )

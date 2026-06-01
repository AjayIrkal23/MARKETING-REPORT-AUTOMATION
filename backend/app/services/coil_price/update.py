"""Coil price service: partial update (quantity, price, active)."""

from __future__ import annotations

from beanie import PydanticObjectId

from ...core.errors import ConflictError, NotFoundError
from ...models.coil_price import CoilPrice, _now_utc
from ...schemas.coil_price import CoilPricePublic, CoilPriceUpdate
from ..audit.events import audit_coil_config_event
from .serialize import to_public


async def update_coil_price(
    coil_price_id: str, data: CoilPriceUpdate, actor_email: str | None
) -> CoilPricePublic:
    try:
        oid = PydanticObjectId(coil_price_id)
    except Exception:
        raise NotFoundError("Coil price not found.")

    doc: CoilPrice | None = await CoilPrice.get(oid)
    if doc is None:
        raise NotFoundError("Coil price not found.")

    changed: list[str] = []
    update_data = data.model_dump(exclude_unset=True)

    if "quantity" in update_data:
        new_quantity = update_data["quantity"]
        existing = await CoilPrice.find_one(
            {"quantity": new_quantity, "_id": {"$ne": oid}}
        )
        if existing is not None:
            raise ConflictError("A coil price for this quantity already exists.")
        doc.quantity = new_quantity
        changed.append("quantity")

    if "price" in update_data:
        doc.price = update_data["price"]
        changed.append("price")

    if "active" in update_data:
        doc.active = update_data["active"]
        changed.append("active")

    doc.updated_at = _now_utc()
    await doc.save()

    await audit_coil_config_event(
        "coil_price.updated",
        f"Updated coil price for quantity {doc.quantity}",
        actor_email=actor_email,
        extra={"coil_price_id": str(doc.id), "changed": changed},
    )
    return to_public(doc)

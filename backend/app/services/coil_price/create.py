"""Coil price service: create a new per-quantity coil price entry.

Business rules:
- ``quantity`` must be unique across coil prices (one price per quantity).
- Raises ``ConflictError`` if a coil price for the same quantity already exists.
- ``created_at`` and ``updated_at`` are both set to the same ``_now_utc()`` at insert.
- Emits a ``coil_config`` audit event (``coil_price.created``) after insert; audit
  failure must NOT abort the persisted record (``record_audit`` never raises).
- Returns a ``CoilPricePublic`` DTO — never the raw Beanie document.
"""

from __future__ import annotations

from ...core.errors import ConflictError
from ...models.coil_price import CoilPrice, _now_utc
from ...schemas.coil_price import CoilPriceCreate, CoilPricePublic
from ..audit.events import audit_coil_config_event
from .serialize import to_public


async def create_coil_price(
    data: CoilPriceCreate, actor_email: str | None
) -> CoilPricePublic:
    """Create a new coil price and emit an audit event.

    Args:
        data:        Validated ``CoilPriceCreate`` DTO (quantity, price, active).
        actor_email: Admin actor email threaded from ``admin.emailid``; ``None`` if unavailable.

    Returns:
        The persisted coil price as a ``CoilPricePublic`` DTO.

    Raises:
        ConflictError: If a coil price for the same quantity already exists.
    """
    existing = await CoilPrice.find_one({"quantity": data.quantity})
    if existing is not None:
        raise ConflictError("A coil price for this quantity already exists.")

    now = _now_utc()
    doc = CoilPrice(
        quantity=data.quantity,
        price=data.price,
        active=data.active,
        created_at=now,
        updated_at=now,
    )
    await doc.insert()

    await audit_coil_config_event(
        "coil_price.created",
        f"Created coil price for quantity {doc.quantity}",
        actor_email=actor_email,
        extra={
            "coil_price_id": str(doc.id),
            "quantity": doc.quantity,
            "price": doc.price,
            "active": doc.active,
        },
    )
    return to_public(doc)

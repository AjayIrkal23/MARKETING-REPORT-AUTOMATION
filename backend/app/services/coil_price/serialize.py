"""Coil price serialisation helpers: document → public DTO.

``id`` is always ``str(doc.id)`` so the MongoDB ObjectId is never exposed to
callers (``api-contract-standards``, ``owasp-security``).  This is a pure
mapping function — no I/O, no side-effects.
"""

from __future__ import annotations

from typing import TYPE_CHECKING

from ...schemas.coil_price import CoilPricePublic

if TYPE_CHECKING:
    from ...models.coil_price import CoilPrice


def to_public(doc: "CoilPrice") -> CoilPricePublic:
    """Map a ``CoilPrice`` document to the list/detail DTO ``CoilPricePublic``."""
    return CoilPricePublic(
        id=str(doc.id),
        quantity=doc.quantity,
        price=doc.price,
        active=doc.active,
        created_at=doc.created_at,
        updated_at=doc.updated_at,
    )

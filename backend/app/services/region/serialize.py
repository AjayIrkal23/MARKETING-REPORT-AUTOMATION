"""Region serialisation helpers: document → public DTO.

Contract: SPEC.md §1.2.
``id`` is always ``str(doc.id)`` so the MongoDB ObjectId is never exposed to
callers (``api-contract-standards``, ``owasp-security``).  This is a pure
mapping function — no I/O, no side-effects.
"""

from __future__ import annotations

from typing import TYPE_CHECKING

from ...schemas.region import RegionPublic

if TYPE_CHECKING:
    from ...models.region import Region


def to_public(doc: "Region") -> RegionPublic:
    """Map a ``Region`` document to the list/detail DTO ``RegionPublic``.

    All fields from the document are included; ``id`` is serialised via
    ``str(doc.id)`` — ObjectId never leaks to callers.
    """
    return RegionPublic(
        id=str(doc.id),
        name=doc.name,
        emails=doc.emails,
        active=doc.active,
        created_at=doc.created_at,
        updated_at=doc.updated_at,
    )

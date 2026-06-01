"""Coil price read-service: single-document fetch by ObjectId.

Parses the route param as a ``PydanticObjectId`` and raises ``NotFoundError``
for both a malformed id string and a missing document, so the caller never
distinguishes the two (no document enumeration, ``owasp-security``).
"""

from __future__ import annotations

from beanie import PydanticObjectId

from ...core.errors import NotFoundError
from ...models.coil_price import CoilPrice
from ...schemas.coil_price import CoilPricePublic
from .serialize import to_public


async def get_coil_price(coil_price_id: str) -> CoilPricePublic:
    """Fetch a single coil price by string-encoded ObjectId.

    Raises:
        NotFoundError: when ``coil_price_id`` is not a valid ObjectId string or
            when no document with that id exists.  The same error type is used
            for both cases so callers cannot enumerate ids (``owasp-security``).
    """
    try:
        oid = PydanticObjectId(coil_price_id)
    except Exception:
        raise NotFoundError("Coil price not found.")

    doc: CoilPrice | None = await CoilPrice.get(oid)
    if doc is None:
        raise NotFoundError("Coil price not found.")

    return to_public(doc)

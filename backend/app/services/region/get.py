"""Region read-service: single-document fetch by ObjectId.

Mirrors ``services/audit_log/get.py`` — parses the route param as a
``PydanticObjectId`` and raises ``NotFoundError`` for both a malformed id
string and a missing document, so the caller never distinguishes the two
(no document enumeration, ``owasp-security``).
"""

from __future__ import annotations

from beanie import PydanticObjectId

from ...core.errors import NotFoundError
from ...models.region import Region
from ...schemas.region import RegionPublic
from .serialize import to_public


async def get_region(region_id: str) -> RegionPublic:
    """Fetch a single region by string-encoded ObjectId.

    Returns the ``RegionPublic`` projection.

    Raises:
        NotFoundError: when ``region_id`` is not a valid ObjectId string or when
            no document with that id exists in the ``regions`` collection.
            The same error type is used for both cases so callers cannot
            enumerate whether an id is syntactically invalid or simply absent
            (``owasp-security``).
    """
    try:
        oid = PydanticObjectId(region_id)
    except Exception:
        raise NotFoundError("Region not found.")

    doc: Region | None = await Region.get(oid)
    if doc is None:
        raise NotFoundError("Region not found.")

    return to_public(doc)

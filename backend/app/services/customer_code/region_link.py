"""Region linkage helpers for the customer_code domain.

Three small async utilities that every customer-code mutation uses to resolve
and name the FK ``region_id`` field stored as a plain ``str`` on
:class:`~app.models.customer_code.CustomerCode`.

Design notes
------------
- :func:`resolve_region_or_400` intentionally raises the *same* error message
  for both a syntactically invalid ObjectId and a valid-but-absent id — this
  prevents document enumeration (``owasp-security`` A04).
- :func:`region_name_map` uses a single ``$in`` query to batch-resolve all ids
  on a list page, avoiding N+1 DB round-trips
  (``backend-performance-standards``).
- :func:`region_name_for` is the single-doc convenience wrapper; it returns
  ``None`` rather than raising so callers can degrade gracefully when a region
  has been deleted after the customer code was created.
"""

from __future__ import annotations

from typing import Any

from beanie import PydanticObjectId

from ...core.errors import ValidationError
from ...models.region import Region


async def resolve_region_or_400(region_id: str) -> Region:
    """Validate *region_id* and return the live :class:`Region` document.

    Used by create, update, and import services before persisting a
    ``region_id`` FK.  Both an invalid hex string and a missing document
    raise :class:`~app.core.errors.ValidationError` with an identical
    message so callers cannot distinguish the two (no enumeration,
    ``owasp-security``).

    Args:
        region_id: Raw string from user input, expected to be a 24-hex
            MongoDB ObjectId.

    Returns:
        The :class:`Region` document for *region_id*.

    Raises:
        ValidationError: When *region_id* is not a valid ObjectId string or
            when no region with that id exists in the ``regions`` collection.
    """
    try:
        oid = PydanticObjectId(region_id)
    except Exception:
        raise ValidationError(
            "Invalid or unknown region.",
            details={"field": "region_id"},
        )

    doc: Region | None = await Region.get(oid)
    if doc is None:
        raise ValidationError(
            "Invalid or unknown region.",
            details={"field": "region_id"},
        )

    return doc


async def region_name_map(region_ids: list[str]) -> dict[str, str]:
    """Batch-resolve a list of region id strings to ``{id_str: name}`` pairs.

    Performs a single ``$in`` query against the ``regions`` collection — O(1)
    DB round-trips regardless of page size (``backend-performance-standards``).

    Ids that cannot be parsed as :class:`~beanie.PydanticObjectId` are silently
    skipped so that stale or malformed references on old documents do not blow
    up a list endpoint.

    Args:
        region_ids: A list of raw string ids, typically
            ``[doc.region_id for doc in page_docs]``.

    Returns:
        A ``dict`` mapping each resolvable id string to the region's ``name``.
        Missing or unparseable ids are absent from the result.
    """
    if not region_ids:
        return {}

    # Parse ids, silently drop unparseable entries
    oids: list[Any] = []
    valid_str_ids: list[str] = []
    for raw in region_ids:
        try:
            oids.append(PydanticObjectId(raw))
            valid_str_ids.append(raw)
        except Exception:
            continue

    if not oids:
        return {}

    docs: list[Region] = await Region.find({"_id": {"$in": oids}}).to_list()
    return {str(doc.id): doc.name for doc in docs}


async def region_name_for(region_id: str) -> str | None:
    """Look up a single region name by id string.

    Convenience wrapper around :func:`region_name_map` for the single-document
    case (``get_customer_code``, ``update_customer_code``).

    Args:
        region_id: Raw string id of the linked region.

    Returns:
        The region ``name`` if found, or ``None`` if *region_id* is invalid or
        the region no longer exists (e.g. deleted after the customer code was
        created).
    """
    result = await region_name_map([region_id])
    return result.get(region_id)

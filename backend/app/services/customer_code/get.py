"""CustomerCode read-service: single-document fetch by ObjectId.

Mirrors ``services/region/get.py`` — parses the route param as a
``PydanticObjectId`` and raises ``NotFoundError`` for both a malformed id
string and a missing document, so the caller never distinguishes the two
(no document enumeration, ``owasp-security``).

Region name is resolved via a single lookup after the document is fetched
and included in the public DTO (``region_name`` field).  A missing or
unresolvable ``region_id`` is non-fatal — ``region_name`` is ``None``.
"""

from __future__ import annotations

from beanie import PydanticObjectId

from ...core.errors import NotFoundError
from ...models.customer_code import CustomerCode
from ...schemas.customer_code import CustomerCodePublic
from .region_link import region_name_for
from .serialize import to_customer_code_public


async def get_customer_code(code_id: str) -> CustomerCodePublic:
    """Fetch a single customer code by string-encoded ObjectId.

    Returns the ``CustomerCodePublic`` projection, which includes a
    resolved ``region_name`` (``None`` if the linked region is missing or
    the ``region_id`` is not a valid ObjectId).

    Raises:
        NotFoundError: when ``code_id`` is not a valid ObjectId string or
            when no document with that id exists in the ``customer_codes``
            collection.  The same error type is used for both cases so
            callers cannot enumerate whether an id is syntactically invalid
            or simply absent (``owasp-security``).
    """
    try:
        oid = PydanticObjectId(code_id)
    except Exception:
        raise NotFoundError("Customer code not found.")

    doc: CustomerCode | None = await CustomerCode.get(oid)
    if doc is None:
        raise NotFoundError("Customer code not found.")

    region_name = await region_name_for(doc.region_id)
    return to_customer_code_public(doc, region_name)

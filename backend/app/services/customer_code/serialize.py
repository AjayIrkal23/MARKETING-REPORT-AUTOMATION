"""CustomerCode serialisation helpers: document → public DTO.

Contract: SPEC.md §2.5, §1 (domain fields).
``id`` is always ``str(doc.id)`` so the MongoDB ObjectId is never exposed to
callers (``api-contract-standards``, ``owasp-security``).  ``region_name`` is
resolved upstream (via ``region_name_for`` or ``region_name_map``) and passed
in — this function performs no I/O and has no side-effects.
"""

from __future__ import annotations

from typing import TYPE_CHECKING

from ...schemas.customer_code import CustomerCodePublic

if TYPE_CHECKING:
    from ...models.customer_code import CustomerCode


def to_customer_code_public(
    doc: "CustomerCode",
    region_name: str | None,
) -> CustomerCodePublic:
    """Map a ``CustomerCode`` document to the list/detail DTO ``CustomerCodePublic``.

    All domain fields from the document are included; ``id`` is serialised via
    ``str(doc.id)`` — ObjectId never leaks to callers.  ``region_name`` is
    supplied by the caller (resolved via ``region_link.region_name_for`` for
    single fetches, or ``region_link.region_name_map`` for batch list pages).

    Args:
        doc:         Hydrated ``CustomerCode`` Beanie document.
        region_name: Human-readable region name, or ``None`` if the linked
                     region could not be resolved (deleted or invalid id).

    Returns:
        ``CustomerCodePublic`` DTO safe for serialisation into the API envelope.
    """
    return CustomerCodePublic(
        id=str(doc.id),
        segment=doc.segment,
        code=doc.code,
        customer=doc.customer,
        destination=doc.destination,
        cam=doc.cam,
        mob=doc.mob,
        head=doc.head,
        route=doc.route,
        ship_to=doc.ship_to,
        ship_to_customer=doc.ship_to_customer,
        region_id=doc.region_id,
        region_name=region_name,
        created_at=doc.created_at,
        updated_at=doc.updated_at,
    )

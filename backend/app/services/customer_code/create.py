"""Customer code service: create a new customer code record.

Business rules (contract .planning/customer-codes/SPEC.md §2.5 / ADDENDUM §create.py):
- No uniqueness check — duplicate ``code`` values are valid (same SAP code can appear
  across multiple ship-to rows for the same customer).
- ``region_id`` must refer to an existing Region document; raises ``ValidationError``
  (400) for an invalid ObjectId string or a valid-hex-but-missing document.  Both cases
  return the same 400 to prevent enumeration (ADDENDUM Area 1 BLOCKER 4).
- ``created_at`` and ``updated_at`` are both set to the same ``_now_utc()`` timestamp
  at insert time.
- Emits a ``customer_codes`` audit event (``customer_code.created``) after insert; audit
  failures MUST NOT abort the successfully-persisted record (``record_audit`` in
  events.py never raises).
- Returns a ``CustomerCodePublic`` DTO — never the raw Beanie document.
"""

from __future__ import annotations

from ...models.customer_code import CustomerCode, _now_utc
from ...schemas.customer_code import CustomerCodeCreate, CustomerCodePublic
from ..audit.events import audit_customer_code_event
from .region_link import region_name_for, resolve_region_or_400
from .serialize import to_customer_code_public


async def create_customer_code(
    data: CustomerCodeCreate,
    *,
    actor_email: str | None,
) -> CustomerCodePublic:
    """Create a new customer code record and emit an audit event.

    Args:
        data:        Validated ``CustomerCodeCreate`` DTO (segment, code, customer,
                     destination, region_id, and optional fields).
        actor_email: Admin actor email threaded from ``admin.emailid``; ``None`` if
                     unavailable.

    Returns:
        The persisted customer code as a ``CustomerCodePublic`` DTO, with the resolved
        ``region_name`` populated.

    Raises:
        ValidationError: If ``region_id`` is not a valid ObjectId string or does not
                         resolve to an existing region document (400).
    """
    # Validate region existence before inserting — same 400 for bad hex and missing doc
    # to prevent ObjectId enumeration (ADDENDUM Area 1 BLOCKER 4).
    region = await resolve_region_or_400(data.region_id)

    now = _now_utc()
    doc = CustomerCode(
        segment=data.segment,
        code=data.code,
        customer=data.customer,
        destination=data.destination,
        cam=data.cam,
        mob=data.mob,
        head=data.head,
        route=data.route,
        ship_to=data.ship_to,
        ship_to_customer=data.ship_to_customer,
        region_id=data.region_id,
        created_at=now,
        updated_at=now,
    )
    await doc.insert()

    await audit_customer_code_event(
        "customer_code.created",
        f"Created customer code '{doc.code}' ({doc.customer})",
        actor_email=actor_email,
        extra={
            "code_id": str(doc.id),
            "code": doc.code,
            "customer": doc.customer,
            "segment": doc.segment,
            "region_id": doc.region_id,
            "region_name": region.name,
        },
    )

    # region_name_for performs a single lookup; region is already validated above, so
    # this will always return a name — it is kept as a separate call to match the
    # pattern used by get.py and list.py (single lookup path for consistency).
    region_name = await region_name_for(doc.region_id)
    return to_customer_code_public(doc, region_name)

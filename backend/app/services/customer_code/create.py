"""Customer code service: create or update a customer code record.

Business rules:
- ``region_id`` must refer to an existing Region document; raises ``ValidationError``
  (400) for an invalid ObjectId string or a valid-hex-but-missing document.
- Matching uses the natural key ``(code, ship_to, region_id)`` case-insensitively.
  Blank ``ship_to`` values are normalised to ``None`` before matching.
- If a matching document exists, all fields are overwritten and ``updated_at`` is
  bumped; otherwise a new document is inserted.
- Emits a ``customer_codes`` audit event after insert/update; audit failures MUST
  NOT abort the successfully-persisted record.
- Returns a ``CustomerCodePublic`` DTO plus a flag indicating whether an existing
  record was updated.
"""

from __future__ import annotations

from datetime import datetime, timezone

from ...models.customer_code import CustomerCode
from ...schemas.customer_code import CustomerCodeCreate, CustomerCodePublic
from ..audit.events import audit_customer_code_event
from .region_link import region_name_for, resolve_region_or_400
from .serialize import to_customer_code_public


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _norm_ship_to(v: str | None) -> str | None:
    return v.strip() if v else None


class CustomerCodeCreateResult:
    """Lightweight wrapper so the controller can choose the correct success message."""

    def __init__(self, item: CustomerCodePublic, was_updated: bool) -> None:
        self.item = item
        self.was_updated = was_updated


async def create_customer_code(
    data: CustomerCodeCreate,
    *,
    actor_email: str | None,
) -> CustomerCodeCreateResult:
    """Upsert a customer code record by (code, ship_to, region_id) and emit audit."""
    region = await resolve_region_or_400(data.region_id)

    ship_to = _norm_ship_to(data.ship_to)

    existing = await CustomerCode.find_one(
        {
            "code": {"$regex": f"^{_escape_regex(data.code)}$", "$options": "i"},
            "ship_to": ship_to,
            "region_id": data.region_id,
        }
    )

    now = _now_utc()
    payload = {
        "segment": data.segment,
        "code": data.code,
        "customer": data.customer,
        "destination": data.destination,
        "cam": data.cam,
        "mob": data.mob,
        "head": data.head,
        "route": data.route,
        "ship_to": ship_to,
        "ship_to_customer": data.ship_to_customer,
        "ship_to_2": _norm_ship_to(data.ship_to_2),
        "ship_to_customer_2": data.ship_to_customer_2,
        "ship_to_city": data.ship_to_city,
        "rake": data.rake,
        "transport_mode": data.transport_mode,
        "region_id": data.region_id,
    }

    if existing is not None:
        for key, value in payload.items():
            setattr(existing, key, value)
        existing.updated_at = now
        await existing.save()
        doc = existing
        was_updated = True
        audit_action = "customer_code.updated"
        audit_message = f"Updated customer code '{doc.code}' ({doc.customer}) via create upsert"
    else:
        doc = CustomerCode(
            **payload,  # type: ignore[arg-type]
            created_at=now,
            updated_at=now,
        )
        await doc.insert()
        was_updated = False
        audit_action = "customer_code.created"
        audit_message = f"Created customer code '{doc.code}' ({doc.customer})"

    await audit_customer_code_event(
        audit_action,
        audit_message,
        actor_email=actor_email,
        extra={
            "code_id": str(doc.id),
            "code": doc.code,
            "customer": doc.customer,
            "segment": doc.segment,
            "region_id": doc.region_id,
            "region_name": region.name,
            "was_updated": was_updated,
        },
    )

    region_name = await region_name_for(doc.region_id)
    return CustomerCodeCreateResult(
        item=to_customer_code_public(doc, region_name),
        was_updated=was_updated,
    )


def _escape_regex(s: str) -> str:
    return __import__("re").escape(s)

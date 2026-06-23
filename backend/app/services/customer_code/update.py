"""Customer-code update service: partial field mutation + audit emission.

Contract: SPEC.md §2.5 ``update.py``; ADDENDUM Area 2 (no setattr loop, no uniqueness
check).  Only the fields present in ``CustomerCodeUpdate`` (``exclude_unset=True``)
are written — callers that omit a key leave the stored value unchanged.

Design decisions (mirroring ``services/region/update.py``):

* ``model_dump(exclude_unset=True)`` drives partial update — ``None`` is a valid
  sentinel meaning "clear this optional field", so absence vs ``None`` must be
  distinguished.
* Each field is enumerated **explicitly by name** (ADDENDUM Area 2): a generic
  ``setattr`` loop risks setting internal Pydantic attributes and bypasses the
  per-field intent list captured in ``changed``.
* ``region_id`` change triggers ``resolve_region_or_400`` (ValidationError 400 for
  bad/missing region) — same guard as create/import.
* **No ConflictError** — ``CustomerCode`` has no uniqueness constraint; duplicates
  are intentionally allowed (ADDENDUM Area 2 note; SPEC §1 "NOT unique").
* ``updated_at`` is always bumped via ``_now_utc()`` if at least one field changed
  (unchanged-field calls still save to avoid stale-document edge cases with Beanie).
* Audit emitted after save; ``region_name_for`` resolves the current region name
  for the returned DTO (may be ``None`` if region was just changed and a very stale
  cache is involved — accepted trade-off).
"""

from __future__ import annotations

from beanie import PydanticObjectId

from ...core.errors import NotFoundError
from ...models.customer_code import CustomerCode, _now_utc
from ...schemas.customer_code import CustomerCodePublic, CustomerCodeUpdate
from ..audit.events import audit_customer_code_event
from .region_link import region_name_for, resolve_region_or_400
from .serialize import to_customer_code_public


async def update_customer_code(
    code_id: str,
    data: CustomerCodeUpdate,
    actor_email: str | None,
) -> CustomerCodePublic:
    """Apply a partial update to a ``CustomerCode`` document and emit an audit event.

    Args:
        code_id:      Hex-string ObjectId of the document to update.
        data:         ``CustomerCodeUpdate`` instance; only ``exclude_unset`` fields
                      are applied so callers may omit unchanged keys.
        actor_email:  Admin email threaded from ``admin.emailid``; ``None`` if
                      the caller context does not carry an authenticated user.

    Returns:
        ``CustomerCodePublic`` DTO reflecting the saved state, with ``region_name``
        resolved from the (possibly updated) ``region_id``.

    Raises:
        NotFoundError:  ``code_id`` is not a valid ObjectId hex string, or no
                        document with that id exists in the collection.
        ValidationError: ``region_id`` is being changed to an id that is not a
                         valid ObjectId, or that does not match any ``Region``
                         document (raised by ``resolve_region_or_400``).
    """
    # --- 1. Load document (404 on bad id format or missing doc) ---
    try:
        oid = PydanticObjectId(code_id)
    except Exception:
        raise NotFoundError("Customer code not found.")

    doc: CustomerCode | None = await CustomerCode.get(oid)
    if doc is None:
        raise NotFoundError("Customer code not found.")

    # --- 2. Apply only the fields the caller explicitly included ---
    changed: list[str] = []
    update_data = data.model_dump(exclude_unset=True)

    # Enumerate each field explicitly — do NOT use a generic setattr loop
    # (ADDENDUM Area 2: risks setting internal Pydantic attributes).
    if "segment" in update_data:
        doc.segment = update_data["segment"]
        changed.append("segment")

    if "code" in update_data:
        doc.code = update_data["code"]
        changed.append("code")

    if "customer" in update_data:
        doc.customer = update_data["customer"]
        changed.append("customer")

    if "destination" in update_data:
        doc.destination = update_data["destination"]
        changed.append("destination")

    if "cam" in update_data:
        doc.cam = update_data["cam"]
        changed.append("cam")

    if "mob" in update_data:
        doc.mob = update_data["mob"]
        changed.append("mob")

    if "head" in update_data:
        doc.head = update_data["head"]
        changed.append("head")

    if "route" in update_data:
        doc.route = update_data["route"]
        changed.append("route")

    if "ship_to" in update_data:
        doc.ship_to = update_data["ship_to"]
        changed.append("ship_to")

    if "ship_to_customer" in update_data:
        doc.ship_to_customer = update_data["ship_to_customer"]
        changed.append("ship_to_customer")

    if "ship_to_city" in update_data:
        doc.ship_to_city = update_data["ship_to_city"]
        changed.append("ship_to_city")

    if "rake" in update_data:
        doc.rake = update_data["rake"]
        changed.append("rake")

    if "transport_mode" in update_data:
        doc.transport_mode = update_data["transport_mode"]
        changed.append("transport_mode")

    if "region_id" in update_data:
        # Validate region existence before mutating the document —
        # raises ValidationError(400) for invalid/unknown region id.
        await resolve_region_or_400(update_data["region_id"])
        doc.region_id = update_data["region_id"]
        changed.append("region_id")

    # --- 3. Bump updated_at and persist ---
    doc.updated_at = _now_utc()
    await doc.save()

    # --- 4. Emit audit event (category "customer_codes", source "service") ---
    await audit_customer_code_event(
        "customer_code.updated",
        f"Updated customer code '{doc.code}' ({doc.customer})",
        actor_email=actor_email,
        extra={"code_id": str(doc.id), "changed": changed},
    )

    # --- 5. Resolve region name for the DTO and return ---
    region_name = await region_name_for(doc.region_id)
    return to_customer_code_public(doc, region_name)

"""Customer code service: bulk-delete selected records by id.

Deletes up to 100 documents in one MongoDB operation. Invalid/unknown ids are
ignored; the caller receives the number of documents actually removed. A single
audit event is emitted for the batch.
"""

from __future__ import annotations

from beanie import PydanticObjectId

from ...models.customer_code import CustomerCode
from ..audit.events import audit_customer_code_event


async def bulk_delete_customer_codes(
    ids: list[str],
    *,
    actor_email: str | None,
) -> int:
    """Delete all valid ``CustomerCode`` documents whose id is in ``ids``.

    Args:
        ids: ObjectId hex strings. Duplicates and invalid hex strings are
             ignored silently.
        actor_email: Admin email for the audit event.

    Returns:
        Number of documents actually deleted.
    """
    valid_ids = []
    for raw in ids:
        try:
            valid_ids.append(PydanticObjectId(raw))
        except Exception:
            continue

    if not valid_ids:
        return 0

    result = await CustomerCode.find({"_id": {"$in": valid_ids}}).delete()
    deleted_count = getattr(result, "deleted_count", 0) or 0

    await audit_customer_code_event(
        "customer_code.bulk_deleted",
        f"Deleted {deleted_count} customer code(s)",
        actor_email=actor_email,
        extra={"count": deleted_count, "requested": len(ids), "ids": ids},
    )

    return deleted_count

"""Customer-code service: delete a customer code document."""

from __future__ import annotations

from beanie import PydanticObjectId

from ...core.errors import NotFoundError
from ...models.customer_code import CustomerCode
from ..audit.events import audit_customer_code_event


async def delete_customer_code(code_id: str, actor_email: str | None) -> None:
    """Delete a customer code by id and emit a ``customer_code.deleted`` audit event.

    Args:
        code_id:     String representation of the MongoDB ObjectId.
        actor_email: Admin actor email threaded from ``admin.emailid``; ``None`` if unavailable.

    Returns:
        ``None`` on success.

    Raises:
        NotFoundError: If the id is invalid or no customer code with the given id exists.
    """
    try:
        oid = PydanticObjectId(code_id)
    except Exception:
        raise NotFoundError("Customer code not found.")

    doc: CustomerCode | None = await CustomerCode.get(oid)
    if doc is None:
        raise NotFoundError("Customer code not found.")

    code_val = doc.code      # capture SAP code before delete
    customer = doc.customer  # capture customer name before delete
    await doc.delete()

    await audit_customer_code_event(
        "customer_code.deleted",
        f"Deleted customer code '{code_val}' ({customer})",
        actor_email=actor_email,
        extra={"code_id": code_id, "code": code_val, "customer": customer},
    )

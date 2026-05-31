"""Audit log read-service: single-document fetch by ObjectId.

Contract: §A10 of SPEC.md.
Mirrors ``services/admin_user/get.py`` — parses the route param as a
``PydanticObjectId`` and raises ``NotFoundError`` for both a malformed id
string and a missing document, so the caller never distinguishes the two
(no log enumeration, ``owasp-security``).
"""

from __future__ import annotations

from beanie import PydanticObjectId

from ...core.errors import NotFoundError
from ...models.audit_log import AuditLog
from ...schemas.audit_log import AuditLogDetail
from .serialize import to_detail


async def get_audit_log(log_id: str) -> AuditLogDetail:
    """Fetch a single audit log entry by string-encoded ObjectId.

    Returns the full ``AuditLogDetail`` projection including all payload,
    actor, and diagnostic fields (shown in the view-details sheet).

    Raises:
        NotFoundError: when ``log_id`` is not a valid ObjectId string or when
            no document with that id exists in the ``audit_logs`` collection.
            The same error type is used for both cases so callers cannot
            enumerate whether an id is syntactically invalid or simply absent
            (``owasp-security``).
    """
    try:
        oid = PydanticObjectId(log_id)
    except Exception:
        raise NotFoundError("Audit log not found.")

    doc: AuditLog | None = await AuditLog.get(oid)
    if doc is None:
        raise NotFoundError("Audit log not found.")

    return to_detail(doc)

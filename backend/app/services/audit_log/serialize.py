"""Audit log serialisation helpers: document → public DTO / detail DTO.

Contract: §A10 of SPEC.md.
``id`` is always ``str(doc.id)`` so the MongoDB ObjectId is never exposed to
callers (``api-contract-standards``, ``owasp-security``).  These are pure
mapping functions — no I/O, no side-effects.
"""

from __future__ import annotations

from typing import TYPE_CHECKING

from ...schemas.audit_log import AuditLogDetail, AuditLogPublic

if TYPE_CHECKING:
    from ...models.audit_log import AuditLog


def to_public(doc: "AuditLog") -> AuditLogPublic:
    """Map an ``AuditLog`` document to the list-row DTO ``AuditLogPublic``.

    Only the fields shown in the table are included; sensitive request/response
    payloads are intentionally excluded from the public projection.
    ``id`` is serialised via ``str(doc.id)`` — ObjectId never leaks to callers.
    """
    return AuditLogPublic(
        id=str(doc.id),
        timestamp=doc.timestamp,
        category=doc.category,
        action=doc.action,
        summary=doc.summary,
        outcome=doc.outcome,
        source=doc.source,
        method=doc.method,
        path=doc.path,
        route=doc.route,
        status_code=doc.status_code,
        duration_ms=doc.duration_ms,
        actor_email=doc.actor_email,
        ip=doc.ip,
    )


def to_detail(doc: "AuditLog") -> AuditLogDetail:
    """Map an ``AuditLog`` document to the full detail DTO ``AuditLogDetail``.

    Extends ``to_public`` with all payload, actor, and diagnostic fields.
    This projection is used by the view-details sheet (``GET /admin/audit-logs/{id}``).
    """
    return AuditLogDetail(
        id=str(doc.id),
        timestamp=doc.timestamp,
        category=doc.category,
        action=doc.action,
        summary=doc.summary,
        outcome=doc.outcome,
        source=doc.source,
        method=doc.method,
        path=doc.path,
        route=doc.route,
        status_code=doc.status_code,
        duration_ms=doc.duration_ms,
        actor_email=doc.actor_email,
        ip=doc.ip,
        actor_is_admin=doc.actor_is_admin,
        user_agent=doc.user_agent,
        request_id=doc.request_id,
        request_meta=doc.request_meta,
        response_meta=doc.response_meta,
        error=doc.error,
        extra=doc.extra,
    )

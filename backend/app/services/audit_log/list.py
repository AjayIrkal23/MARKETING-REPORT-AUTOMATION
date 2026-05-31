"""Audit log read-service: backend-driven paginated listing.

Contract: §A10 of SPEC.md.
Mirrors ``services/admin_user/list.py`` exactly — same pagination pattern,
same return signature shape ``tuple[list[DTO], PaginationMeta]``.
All filtering and sorting run in the DB layer; no Python-side post-filtering
(``backend-api-standards``, no client-side filtering).
"""

from __future__ import annotations

from math import ceil

from ...core.responses import PaginationMeta
from ...models.audit_log import AuditLog
from ...schemas.audit_log import AuditLogListQuery, AuditLogPublic
from ...utils.audit_log.query import build_audit_filter, build_sort
from .serialize import to_public


async def list_audit_logs(
    query: AuditLogListQuery,
) -> tuple[list[AuditLogPublic], PaginationMeta]:
    """Return a page of audit log projections plus stable pagination metadata.

    Filtering, sorting, and pagination all run in the DB layer so the
    frontend never receives unfiltered data (``backend-api-standards``,
    no client-side filtering).  The filter document is built by
    ``build_audit_filter`` which escapes all user input (``owasp-security``).
    """
    filt = build_audit_filter(query)

    total = await AuditLog.find(filt).count()

    docs = (
        await AuditLog.find(filt)
        .sort(build_sort(query.sortBy, query.sortOrder))
        .skip(query.skip)
        .limit(query.limit)
        .to_list()
    )

    items = [to_public(doc) for doc in docs]

    meta = PaginationMeta(
        page=query.page,
        limit=query.limit,
        total=total,
        totalPages=ceil(total / query.limit) if query.limit else 0,
        sortBy=query.sortBy,
        sortOrder=query.sortOrder,
    )

    return items, meta

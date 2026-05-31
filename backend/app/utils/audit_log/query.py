"""Query helpers for the audit_log domain (filter + sort building).

Contract: §A9 of .planning/audit/SPEC.md.
``build_audit_filter`` applies ``re.escape`` to all user-supplied string inputs
before any ``$regex`` construction (ReDoS guard, OWASP A05).  Free-text search
(``q``) uses ``$or`` across ``path``, ``summary``, ``action``, and
``actor_email``.  The ``actor`` field is also matched via a case-insensitive
``$regex`` on ``actor_email``.  All other filters are exact-match predicates
added only when present.
``build_sort`` mirrors the pattern in ``utils/admin_user/query.py``.
"""

from __future__ import annotations

import re
from typing import Any

from ...schemas.audit_log import AuditLogListQuery


def build_audit_filter(query: AuditLogListQuery) -> dict[str, Any]:
    """Translate validated query params into a MongoDB filter document.

    Free-text search (``q``) runs a case-insensitive ``$regex`` across
    ``path``, ``summary``, ``action``, and ``actor_email`` using ``$or``.
    The user-supplied string is escaped with ``re.escape`` before insertion so
    no regex meta-characters can leak through — length is already capped to
    200 chars on the schema (``backend-api-standards``, ``owasp-security``).

    ``actor`` applies a case-insensitive partial match against ``actor_email``
    so operators can type a partial email or username.  ``method`` is
    normalised to upper-case before comparison (e.g. "get" → "GET") to match
    the stored value written by the middleware.

    Date-range predicates (``dateFrom`` / ``dateTo``) are combined into a
    single ``timestamp`` document so MongoDB uses the compound index
    efficiently.
    """
    filt: dict[str, Any] = {}

    # -- free-text $or search ---------------------------------------------------
    if query.q:
        escaped = re.escape(query.q)
        rx = {"$regex": escaped, "$options": "i"}
        filt["$or"] = [
            {"path": rx},
            {"summary": rx},
            {"action": rx},
            {"actor_email": rx},
        ]

    # -- exact-match / enum filters ---------------------------------------------
    if query.category:
        filt["category"] = query.category

    if query.outcome:
        filt["outcome"] = query.outcome

    if query.source:
        filt["source"] = query.source

    if query.action:
        filt["action"] = query.action

    if query.method:
        # Normalise to upper-case; the middleware stores e.g. "GET", "POST".
        filt["method"] = query.method.upper()

    if query.status is not None:
        filt["status_code"] = query.status

    # -- partial actor match ----------------------------------------------------
    if query.actor:
        filt["actor_email"] = {
            "$regex": re.escape(query.actor),
            "$options": "i",
        }

    # -- date-range predicate ---------------------------------------------------
    ts: dict[str, Any] = {}
    if query.dateFrom:
        ts["$gte"] = query.dateFrom
    if query.dateTo:
        ts["$lte"] = query.dateTo
    if ts:
        filt["timestamp"] = ts

    return filt


def build_sort(sort_by: str, sort_order: str) -> str:
    """Build a Beanie sort token (``+field`` / ``-field``) from whitelisted input.

    ``sort_by`` is constrained to ``AuditSortBy`` at the schema layer so only
    the nine whitelisted field names can ever reach here
    (``backend-api-standards``).
    """
    prefix = "+" if sort_order == "asc" else "-"
    return f"{prefix}{sort_by}"

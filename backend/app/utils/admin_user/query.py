"""Query helpers for the admin_user domain (filter + sort building).

Contract: §3.9 of USER-MANAGEMENT-PLAN.md.
``build_admin_filter`` applies re.escape to the free-text query (ReDoS guard,
OWASP A05) and matches across both ``name`` and ``emailid``.  Status and role
filters are applied only when the value is not ``"all"``.
``build_sort`` mirrors the pattern in ``utils/user/query.py``.
"""

from __future__ import annotations

import re
from typing import Any

from ...schemas.admin_user import AdminUserListQuery


def build_admin_filter(query: AdminUserListQuery) -> dict[str, Any]:
    """Translate validated query params into a MongoDB filter document.

    Free-text search (``q``) runs a case-insensitive ``$regex`` across
    **both** ``name`` and ``emailid`` using ``$or``.  The user-supplied string
    is escaped with ``re.escape`` before insertion so no regex meta-characters
    can leak through — length is already capped to 100 chars on the schema
    (``backend-api-standards``, ``owasp-security``).

    ``status`` and ``role`` filters are only added to the document when their
    value is not the sentinel ``"all"`` so that the default (all records)
    requires no extra DB predicate.
    """
    filt: dict[str, Any] = {}

    if query.q:
        escaped = re.escape(query.q)
        regex_doc = {"$regex": escaped, "$options": "i"}
        filt["$or"] = [
            {"name": regex_doc},
            {"emailid": regex_doc},
        ]

    if query.status != "all":
        filt["status"] = query.status

    if query.role != "all":
        # ``isAdmin`` is the model field; "admin" maps to True, "user" to False.
        filt["isAdmin"] = query.role == "admin"

    return filt


def build_sort(sort_by: str, sort_order: str) -> str:
    """Build a Beanie sort token (``+field`` / ``-field``) from whitelisted input.

    ``sort_by`` is constrained to ``AdminUserSortBy`` at the schema layer so
    only the six whitelisted field names can ever reach here
    (``backend-api-standards``).
    """
    prefix = "+" if sort_order == "asc" else "-"
    return f"{prefix}{sort_by}"

"""Query helpers for the users domain (filter + sort building)."""

from __future__ import annotations

import re
from typing import Any

from ...schemas.user import UserListQuery


def build_user_filter(query: UserListQuery) -> dict[str, Any]:
    """Translate validated query params into a MongoDB filter document."""
    filt: dict[str, Any] = {}
    if query.q:
        # Escape user input before using it as a regex: a raw `$regex` would
        # allow catastrophic-backtracking patterns (ReDoS, OWASP A05). The
        # length is already capped to 100 chars on the schema. Case-insensitive
        # "contains" match on email.
        filt["emailid"] = {"$regex": re.escape(query.q), "$options": "i"}
    return filt


def build_sort(sort_by: str, sort_order: str) -> str:
    """Build a Beanie sort token (``+field`` / ``-field``) from whitelisted input."""
    return f"{'+' if sort_order == 'asc' else '-'}{sort_by}"

"""Query helpers for the users domain (filter + sort building)."""

from __future__ import annotations

from ...schemas.user import UserListQuery


def build_user_filter(query: UserListQuery) -> dict:
    """Translate validated query params into a MongoDB filter document."""
    filt: dict = {}
    if query.q:
        # Case-insensitive email search. Fine for a small users table; revisit
        # (index / text search) if this collection ever grows large.
        filt["emailid"] = {"$regex": query.q, "$options": "i"}
    return filt


def build_sort(sort_by: str, sort_order: str) -> str:
    """Build a Beanie sort token (``+field`` / ``-field``) from whitelisted input."""
    return f"{'+' if sort_order == 'asc' else '-'}{sort_by}"

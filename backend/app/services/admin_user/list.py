"""Admin user-domain business logic: backend-driven paginated listing.

Contract: §3.8 / §3.9 of USER-MANAGEMENT-PLAN.md.
Mirrors ``services/user/list.py`` exactly — same pagination pattern,
same return signature shape ``tuple[list[DTO], PaginationMeta]``.
All filtering and sorting run in the DB layer; no Python-side post-filtering.
"""

from __future__ import annotations

from math import ceil

from ...core.responses import PaginationMeta
from ...models.user import User
from ...schemas.admin_user import AdminUserListQuery, AdminUserPublic, to_admin_user_public
from ...utils.admin_user.query import build_admin_filter, build_sort


async def list_users(
    query: AdminUserListQuery,
) -> tuple[list[AdminUserPublic], PaginationMeta]:
    """Return a page of admin-visible user projections plus stable pagination metadata.

    Filtering, sorting, and pagination all run in the DB layer so the
    frontend never receives unfiltered data (``backend-api-standards``,
    no client-side filtering).
    """
    filt = build_admin_filter(query)

    total = await User.find(filt).count()

    docs = (
        await User.find(filt)
        .sort(build_sort(query.sortBy, query.sortOrder))
        .skip(query.skip)
        .limit(query.limit)
        .to_list()
    )

    items = [to_admin_user_public(doc) for doc in docs]

    meta = PaginationMeta(
        page=query.page,
        limit=query.limit,
        total=total,
        totalPages=ceil(total / query.limit) if query.limit else 0,
        sortBy=query.sortBy,
        sortOrder=query.sortOrder,
    )

    return items, meta

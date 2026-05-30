"""User-domain business logic: backend-driven paginated listing."""

from __future__ import annotations

from math import ceil

from ...core.responses import PaginationMeta
from ...models import User
from ...schemas.user import UserListQuery, UserPublic
from ...utils.user.query import build_sort, build_user_filter


async def list_users(query: UserListQuery) -> tuple[list[UserPublic], PaginationMeta]:
    """Return a page of users plus stable pagination metadata.

    Filtering, sorting and pagination all run in the DB layer.
    """
    filt = build_user_filter(query)
    total = await User.find(filt).count()
    docs = (
        await User.find(filt)
        .sort(build_sort(query.sortBy, query.sortOrder))
        .skip(query.skip)
        .limit(query.limit)
        .to_list()
    )
    items = [
        UserPublic(emailid=d.emailid, isAdmin=d.isAdmin, lastlogined=d.lastlogined) for d in docs
    ]
    meta = PaginationMeta(
        page=query.page,
        limit=query.limit,
        total=total,
        totalPages=ceil(total / query.limit) if query.limit else 0,
        sortBy=query.sortBy,
        sortOrder=query.sortOrder,
    )
    return items, meta

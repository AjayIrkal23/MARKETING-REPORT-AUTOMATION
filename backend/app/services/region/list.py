"""Region-domain business logic: backend-driven paginated listing.

Mirrors ``services/admin_user/list.py`` and ``services/user/list.py`` exactly —
same pagination pattern, same return signature shape ``tuple[list[DTO], PaginationMeta]``.
All filtering and sorting run in the DB layer; no Python-side post-filtering.
"""

from __future__ import annotations

from math import ceil

from ...core.responses import PaginationMeta
from ...models.region import Region
from ...schemas.region import RegionListQuery, RegionPublic
from ...utils.region.query import build_region_filter, build_sort
from .serialize import to_public


async def list_regions(
    query: RegionListQuery,
) -> tuple[list[RegionPublic], PaginationMeta]:
    """Return a page of regions plus stable pagination metadata.

    Filtering, sorting, and pagination all run in the DB layer so the
    frontend never receives unfiltered data (``backend-api-standards``,
    no client-side filtering).
    """
    filt = build_region_filter(query)

    total = await Region.find(filt).count()

    docs = (
        await Region.find(filt)
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

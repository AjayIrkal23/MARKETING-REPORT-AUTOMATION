"""Coil price domain business logic: backend-driven paginated listing.

Mirrors ``services/region/list.py`` exactly — same pagination pattern, same
return signature shape ``tuple[list[DTO], PaginationMeta]``.  All filtering and
sorting run in the DB layer; no Python-side post-filtering.
"""

from __future__ import annotations

from math import ceil

from ...core.responses import PaginationMeta
from ...models.coil_price import CoilPrice
from ...schemas.coil_price import CoilPriceListQuery, CoilPricePublic
from ...utils.coil_price.query import build_coil_price_filter, build_sort
from .serialize import to_public


async def list_coil_prices(
    query: CoilPriceListQuery,
) -> tuple[list[CoilPricePublic], PaginationMeta]:
    """Return a page of coil prices plus stable pagination metadata.

    Filtering, sorting, and pagination all run in the DB layer so the
    frontend never receives unfiltered data (``backend-api-standards``,
    no client-side filtering).
    """
    filt = build_coil_price_filter(query)

    total = await CoilPrice.find(filt).count()

    docs = (
        await CoilPrice.find(filt)
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

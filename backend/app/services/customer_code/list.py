"""Customer-code domain business logic: backend-driven paginated listing.

Mirrors ``services/region/list.py`` exactly — same pagination pattern, same
return-signature shape ``tuple[list[DTO], PaginationMeta]``.
All filtering and sorting run in the DB layer; no Python-side post-filtering
(``backend-api-standards``, no client-side filtering).

After the page is fetched, region names are resolved in a single batch query
via ``region_link.region_name_map`` so the public DTO exposes ``region_name``
without an N+1 query pattern.
"""

from __future__ import annotations

from math import ceil

from ...core.responses import PaginationMeta
from ...models.customer_code import CustomerCode
from ...schemas.customer_code import CustomerCodeListQuery, CustomerCodePublic
from ...utils.customer_code.query import build_customer_code_filter, build_sort
from .region_link import region_name_map
from .serialize import to_customer_code_public


async def list_customer_codes(
    query: CustomerCodeListQuery,
) -> tuple[list[CustomerCodePublic], PaginationMeta]:
    """Return a page of customer codes plus stable pagination metadata.

    Filtering, sorting, and pagination all run in the DB layer so the
    frontend never receives unfiltered data (``backend-api-standards``,
    no client-side filtering).

    Region names are resolved in a single batch lookup after the page is
    fetched — one extra DB round-trip per list call, never N+1.

    Args:
        query: Validated list-query DTO carrying page, limit, sortBy,
               sortOrder, free-text ``q``, per-field filters, and the
               optional ``region`` (region_id exact-match) filter.

    Returns:
        A 2-tuple of ``(items, meta)`` where ``items`` is the serialised
        page and ``meta`` carries pagination bookkeeping for the frontend.
    """
    filt = build_customer_code_filter(query)

    total = await CustomerCode.find(filt).count()

    docs = (
        await CustomerCode.find(filt)
        .sort(build_sort(query.sortBy, query.sortOrder))
        .skip(query.skip)
        .limit(query.limit)
        .to_list()
    )

    # Batch-resolve region names in one query — avoids N+1 round-trips.
    name_map = await region_name_map([d.region_id for d in docs])

    items = [
        to_customer_code_public(doc, name_map.get(doc.region_id))
        for doc in docs
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

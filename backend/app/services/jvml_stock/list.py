# app/services/jvml_stock/list.py
"""JVML Stock domain business logic: backend-driven paginated listing.

Mirrors ``services/customer_code/list.py`` exactly — same pagination pattern,
same return-signature shape ``tuple[list[DTO], PaginationMeta]``.
All filtering and sorting run in the DB layer; no Python-side post-filtering
(``backend-api-standards``, no client-side filtering).

No region/FK lookup needed — all denormalised fields (customer_name,
customer_code_id) are already stored on each document.
"""
from __future__ import annotations

from math import ceil

from ...core.responses import PaginationMeta
from ...models.jvml_stock import JvmlStock
from ...schemas.jvml_stock import JvmlStockListQuery
from ...schemas.jvml_stock_record import JvmlStockPublic
from ...utils.jvml_stock.query import build_jvml_stock_filter, build_sort
from .serialize import to_jvml_stock_public


async def list_jvml_stock(
    query: JvmlStockListQuery,
) -> tuple[list[JvmlStockPublic], PaginationMeta]:
    """Return a page of JVML stock rows plus stable pagination metadata.

    Filtering, sorting, and pagination all run in the DB layer.

    Args:
        query: Validated list-query DTO carrying page, limit, sortBy,
               sortOrder, the single ``date`` filter, and the 4 per-field
               filters (sales_order_type, customer_name, sales_office,
               nco_declared).

    Returns:
        A 2-tuple of ``(items, meta)`` where ``items`` is the serialised
        page and ``meta`` carries pagination bookkeeping for the frontend.
    """
    filt = build_jvml_stock_filter(query)

    total = await JvmlStock.find(filt).count()

    docs = (
        await JvmlStock.find(filt)
        .sort(build_sort(query.sortBy, query.sortOrder))
        .skip(query.skip)
        .limit(query.limit)
        .to_list()
    )

    items = [to_jvml_stock_public(doc) for doc in docs]

    meta = PaginationMeta(
        page=query.page,
        limit=query.limit,
        total=total,
        totalPages=ceil(total / query.limit) if query.limit else 0,
        sortBy=query.sortBy,
        sortOrder=query.sortOrder,
    )

    return items, meta

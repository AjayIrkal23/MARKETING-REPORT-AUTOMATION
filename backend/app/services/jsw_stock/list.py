# app/services/jsw_stock/list.py
"""JswStock domain: backend-driven paginated listing.

Mirrors services/customer_code/list.py exactly.
No region lookup needed — customer_name is stored denormalised on every document
(set at ingest time from the CustomerCode collection). All filtering and sorting
run in the DB layer; no Python-side post-filtering (backend-api-standards).
"""
from __future__ import annotations

from math import ceil

from ...core.responses import PaginationMeta
from ...models.customer_code import CustomerCode
from ...models.jsw_stock import JswStock
from ...schemas.jsw_stock import JswStockListQuery
from ...schemas.jsw_stock_record import JswStockPublic
from ...utils.jsw_stock.query import build_jsw_stock_filter, build_sort
from .serialize import to_jsw_stock_public


async def list_jsw_stock(
    query: JswStockListQuery,
) -> tuple[list[JswStockPublic], PaginationMeta]:
    """Return a page of JswStock rows plus stable pagination metadata.

    Pipeline: build filter → count → sort/skip/limit → serialize → build meta.
    Every operation runs in MongoDB; no client-side filtering ever occurs.

    Args:
        query: Validated list-query DTO carrying page, limit, sortBy, sortOrder,
               the single ``date`` filter, and the 4 per-field filters
               (sales_order_type, customer_name, sales_office, nco_declared).

    Returns:
        A 2-tuple of (items, meta) where items is the serialised page and meta
        carries pagination bookkeeping consumed by the frontend table component.
    """
    filt = build_jsw_stock_filter(query)

    if query.region:
        region_docs = await CustomerCode.find({"region_id": query.region}).to_list()
        region_codes = [str(doc.id) for doc in region_docs]
        filt["customer_code_id"] = {"$in": region_codes}

    total = await JswStock.find(filt).count()

    docs = (
        await JswStock.find(filt)
        .sort(build_sort(query.sortBy, query.sortOrder))
        .skip(query.skip)
        .limit(query.limit)
        .to_list()
    )

    items = [to_jsw_stock_public(doc) for doc in docs]

    meta = PaginationMeta(
        page=query.page,
        limit=query.limit,
        total=total,
        totalPages=ceil(total / query.limit) if query.limit else 0,
        sortBy=query.sortBy,
        sortOrder=query.sortOrder,
    )

    return items, meta

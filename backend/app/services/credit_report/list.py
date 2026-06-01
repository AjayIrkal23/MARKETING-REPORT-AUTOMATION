# app/services/credit_report/list.py
"""Credit Report domain business logic: backend-driven paginated listing.

Mirrors ``services/customer_code/list.py`` exactly — same pagination pattern,
same return-signature shape ``tuple[list[DTO], PaginationMeta]``.
All filtering and sorting run in the DB layer; no Python-side post-filtering
(``backend-api-standards``, no client-side filtering).

No region/FK lookup needed — customer_name is a native column stored directly.
"""
from __future__ import annotations

from math import ceil

from ...core.responses import PaginationMeta
from ...models.credit_report import CreditReport
from ...schemas.credit_report import CreditReportListQuery
from ...schemas.credit_report_record import CreditReportPublic
from ...utils.credit_report.query import build_credit_report_filter, build_sort
from .serialize import to_credit_report_public


async def list_credit_report(
    query: CreditReportListQuery,
) -> tuple[list[CreditReportPublic], PaginationMeta]:
    """Return a page of credit report rows plus stable pagination metadata.

    Filtering, sorting, and pagination all run in the DB layer.

    Args:
        query: Validated list-query DTO carrying page, limit, sortBy,
               sortOrder, the optional ``date`` filter, 4 per-field
               async-select filters (customer_name, city, customer,
               cca_description), and 2 enum filters (blocked,
               credit_balance_sign).

    Returns:
        A 2-tuple of ``(items, meta)`` where ``items`` is the serialised
        page and ``meta`` carries pagination bookkeeping for the frontend.
    """
    filt = build_credit_report_filter(query)

    total = await CreditReport.find(filt).count()

    docs = (
        await CreditReport.find(filt)
        .sort(build_sort(query.sortBy, query.sortOrder))
        .skip(query.skip)
        .limit(query.limit)
        .to_list()
    )

    items = [to_credit_report_public(doc) for doc in docs]

    meta = PaginationMeta(
        page=query.page,
        limit=query.limit,
        total=total,
        totalPages=ceil(total / query.limit) if query.limit else 0,
        sortBy=query.sortBy,
        sortOrder=query.sortOrder,
    )

    return items, meta

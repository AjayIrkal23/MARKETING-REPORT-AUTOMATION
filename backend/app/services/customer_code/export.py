"""Customer code service: export matching rows as an .xlsx workbook.

The exported file uses the same header order as the import template so admins
can re-import it after editing. Export is filter-aware: it applies the same
predicates as ``list_customer_codes`` but returns every matching row without
pagination.
"""

from __future__ import annotations

import io
from datetime import datetime, timezone
from typing import Any

from ...models.customer_code import CustomerCode
from ...schemas.customer_code import CustomerCodeListQuery
from ...utils.customer_code.excel import TEMPLATE_HEADERS, add_template_fingerprint
from ...utils.customer_code.query import build_customer_code_filter
from ...utils.shared.export_style import (
    add_metadata_sheet,
    auto_size_columns,
    enable_filters,
    style_header_row,
)


def _cell_value(v: object) -> object:
    """Return a value suitable for openpyxl, converting None to empty string."""
    return "" if v is None else v


def _filter_summary(query: CustomerCodeListQuery) -> str:
    """Build a concise, human-readable summary of applied export filters."""
    applied: dict[str, str] = {}
    for key in (
        "q", "segment", "code", "customer", "destination",
        "cam", "mob", "ship_to_city", "rake", "transport_mode", "region",
    ):
        value = getattr(query, key)
        if value:
            applied[key] = value
    if not applied:
        return "None"
    return ", ".join(f"{k}={v}" for k, v in applied.items())


async def export_customer_codes(query: CustomerCodeListQuery) -> bytes:
    """Build and return an .xlsx export of all customer codes matching ``query``.

    Args:
        query: Validated list-query DTO (filters, search, but pagination/sort
               are ignored for export — all matches are returned).

    Returns:
        Raw ``.xlsx`` bytes ready for ``StreamingResponse``.
    """
    import openpyxl  # lazy — consistent with other excel consumers

    filt = build_customer_code_filter(query)
    docs = await CustomerCode.find(filt).sort("+code").to_list()

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Customer Codes"

    add_template_fingerprint(wb)

    ws.append(TEMPLATE_HEADERS)
    style_header_row(ws[1])

    for doc in docs:
        ws.append([
            _cell_value(doc.segment),
            _cell_value(doc.code),
            _cell_value(doc.customer),
            _cell_value(doc.destination),
            _cell_value(doc.cam),
            _cell_value(doc.mob),
            _cell_value(doc.head),
            _cell_value(doc.route),
            _cell_value(doc.ship_to),
            _cell_value(doc.ship_to_customer),
            _cell_value(doc.ship_to_city),
            _cell_value(doc.rake),
            _cell_value(doc.transport_mode),
        ])

    enable_filters(ws)
    auto_size_columns(ws)

    add_metadata_sheet(
        wb,
        title="Customer Codes Export",
        items={
            "Exported At": datetime.now(timezone.utc).isoformat(),
            "Filter Summary": _filter_summary(query),
        },
    )

    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()

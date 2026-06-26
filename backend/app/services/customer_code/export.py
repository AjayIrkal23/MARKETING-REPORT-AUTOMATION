"""Customer code service: export matching rows as an .xlsx workbook.

The exported file uses the same header order as the import template (headers on
row 1 + a hidden fingerprint) so admins can re-import it after editing. Export is
filter-aware: same predicates as ``list_customer_codes`` but every matching row,
unpaginated. Styling is the premium slate header + zebra look — but, unlike the
report sheets, **no title banner**: a banner would push headers off row 1 and
break the round-trip import.
"""

from __future__ import annotations

import io
from datetime import datetime, timezone

from ...models.customer_code import CustomerCode
from ...schemas.customer_code import CustomerCodeListQuery
from ...utils.customer_code.excel import TEMPLATE_HEADERS, add_template_fingerprint
from ...utils.customer_code.query import build_customer_code_filter
from ...utils.report.excel_style import (
    add_premium_metadata_sheet,
    auto_size_columns,
    enable_table_filter,
    freeze_header_and_fixed_cols,
    style_data_row,
    style_premium_header_row,
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

    Pagination/sort are ignored — all matches are returned. Headers stay on row 1
    (re-importable) with premium slate styling + zebra rows.
    """
    import openpyxl  # lazy — consistent with other excel consumers

    filt = build_customer_code_filter(query)
    docs = await CustomerCode.find(filt).sort("+code").to_list()

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Customer Codes"

    add_template_fingerprint(wb)

    n_cols = len(TEMPLATE_HEADERS)
    ws.append(TEMPLATE_HEADERS)
    style_premium_header_row(ws, 1, n_cols)

    for i, doc in enumerate(docs):
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
        style_data_row(ws, 2 + i, n_cols, is_alt_group=(i % 2 == 1))

    last_row = 1 + len(docs)
    enable_table_filter(ws, 1, n_cols, max(last_row, 1))
    freeze_header_and_fixed_cols(ws, 1, 0)
    ws.row_dimensions[1].height = 26
    auto_size_columns(ws)

    add_premium_metadata_sheet(
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

"""Customer code service: export matching rows as an .xlsx workbook.

The exported file uses the same 15-column header order as the import template
so admins can re-import it after editing. Export is filter-aware: it applies
the same predicates as ``list_customer_codes`` but returns every matching row
without pagination.
"""

from __future__ import annotations

import io
from typing import Any

from ...models.customer_code import CustomerCode
from ...schemas.customer_code import CustomerCodeListQuery
from ...utils.customer_code.excel import TEMPLATE_HEADERS
from ...utils.customer_code.query import build_customer_code_filter


def _cell_value(v: object) -> object:
    """Return a value suitable for openpyxl, converting None to empty string."""
    return "" if v is None else v


async def export_customer_codes(query: CustomerCodeListQuery) -> bytes:
    """Build and return an .xlsx export of all customer codes matching ``query``.

    Args:
        query: Validated list-query DTO (filters, search, but pagination/sort
               are ignored for export — all matches are returned).

    Returns:
        Raw ``.xlsx`` bytes ready for ``StreamingResponse``.
    """
    import openpyxl  # lazy — consistent with other excel consumers
    from openpyxl.styles import Font, PatternFill

    filt = build_customer_code_filter(query)
    docs = await CustomerCode.find(filt).sort("+code").to_list()

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Customer Codes"

    header_fill = PatternFill(start_color="D9E1F2", end_color="D9E1F2", fill_type="solid")
    header_font = Font(bold=True)
    ws.append(TEMPLATE_HEADERS)
    for cell in ws[1]:
        cell.font = header_font
        cell.fill = header_fill

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
            _cell_value(doc.ship_to_2),
            _cell_value(doc.ship_to_customer_2),
            _cell_value(doc.ship_to_city),
            _cell_value(doc.rake),
            _cell_value(doc.transport_mode),
        ])

    # Auto-size columns.
    for col_idx, col_cells in enumerate(ws.columns, start=1):
        max_len = max(
            len(str(cell.value)) if cell.value is not None else 0
            for cell in col_cells
        )
        ws.column_dimensions[
            openpyxl.utils.get_column_letter(col_idx)
        ].width = max_len + 4

    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()

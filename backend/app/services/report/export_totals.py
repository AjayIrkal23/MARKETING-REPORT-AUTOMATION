"""RAKE totals sheet writer (``write_totals_sheet``).

Builds one premium totals table (``{header} | Total Qty`` + Grand Total).
Consumed by the combined report export ("TOTAL RAKE REPORT"); there is no
standalone totals .xlsx endpoint.
"""

from __future__ import annotations

from openpyxl.workbook.workbook import Workbook

from ...utils.shared.excel_premium import write_flat_table


def write_totals_sheet(
    wb: Workbook,
    *,
    sheet_title: str,
    table_header: str,
    rows: list[tuple[str, float]],
    subtitle: str,
) -> None:
    """Write one premium totals sheet (``{table_header} | Total Qty`` + Grand Total)."""
    ws = wb.create_sheet(title=sheet_title)
    grand = sum(qty for _, qty in rows)
    body = [[label, qty or ""] for label, qty in rows]
    write_flat_table(
        ws,
        title=sheet_title,
        subtitle=subtitle,
        headers=[table_header, "Total Qty"],
        rows=body,
        col_formats={2: "qty"},
        total_row=["Grand Total", grand or ""],
        note="No data for this selection.",
    )

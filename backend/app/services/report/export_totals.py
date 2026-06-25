"""Export rake-totals + transport-mode-totals for the Report JSW/JVML as .xlsx."""

from __future__ import annotations

import io
from datetime import datetime, timezone

from ...schemas.report import ReportQuery
from ...utils.report.excel_style import (
    ALIGN_LEFT,
    ALIGN_RIGHT,
    add_premium_metadata_sheet,
    add_title_banner,
    auto_size_columns,
    enable_table_filter,
    fmt_quantity,
    freeze_header_and_fixed_cols,
    setup_print_page,
    style_data_row,
    style_grand_total_row,
    style_premium_header_row,
)
from .generate import generate_report


def _write_totals_sheet(ws, title: str, rows: list[tuple[str, float]]) -> None:
    """Write a 2-column totals table (Label | Total Qty) to *ws*."""
    n_cols = 2
    grand = sum(qty for _, qty in rows)

    subtitle = f"Exported: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}"
    add_title_banner(ws, 1, n_cols, title, subtitle)

    headers = [title, "Total Qty"]
    ws.append(headers)
    header_row = 3
    style_premium_header_row(ws, header_row, n_cols)
    ws.cell(row=header_row, column=1).alignment = ALIGN_LEFT
    ws.cell(row=header_row, column=2).alignment = ALIGN_RIGHT

    for i, (label, qty) in enumerate(rows):
        ws.append([label, qty or ""])
        row_idx = header_row + 1 + i
        style_data_row(ws, row_idx, n_cols, is_alt_group=i % 2 == 1)
        ws.cell(row=row_idx, column=1).alignment = ALIGN_LEFT
        fmt_quantity(ws.cell(row=row_idx, column=2))
        ws.cell(row=row_idx, column=2).alignment = ALIGN_RIGHT

    grand_row = header_row + 1 + len(rows)
    ws.append(["Grand Total", grand or ""])
    style_grand_total_row(ws, grand_row, n_cols, 1)
    fmt_quantity(ws.cell(row=grand_row, column=2))
    ws.cell(row=grand_row, column=2).alignment = ALIGN_RIGHT

    enable_table_filter(ws, header_row, n_cols, grand_row - 1)
    freeze_header_and_fixed_cols(ws, header_row, 0)
    ws.row_dimensions[header_row].height = 26
    auto_size_columns(ws)
    setup_print_page(ws, title)


async def export_rake_totals(query: ReportQuery) -> bytes:
    """Generate the report and export rake + transport-mode totals as .xlsx."""
    import openpyxl

    report = await generate_report(query)

    wb = openpyxl.Workbook()

    ws_rake = wb.active
    ws_rake.title = "RAKE Totals"
    rake_rows = sorted(report.rake_totals.items())
    _write_totals_sheet(ws_rake, "RAKE", rake_rows)

    ws_tm = wb.create_sheet("Transport Mode Totals")
    tm_rows = sorted(report.transport_mode_totals.items())
    _write_totals_sheet(ws_tm, "Transport Mode", tm_rows)

    add_premium_metadata_sheet(
        wb,
        title="Rake Totals Export",
        items={
            "Export time": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC"),
            "Report date": query.date,
            "Report type": query.report_type.upper(),
            "Region": report.region_name,
            "Days filter": query.days,
        },
    )

    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()

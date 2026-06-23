"""Report JSW/JVML business logic: export the generated RAKE-pivot report as .xlsx."""

from __future__ import annotations

import io
from datetime import datetime, timezone
from typing import Any

from ...schemas.report import ReportQuery, ReportResponse
from ...utils.shared.export_style import (
    add_metadata_sheet,
    auto_size_columns,
    enable_filters,
    style_header_row,
)
from .generate import generate_report


# Fixed row fields in display order.
_FIXED_HEADERS = [
    "Distr. Channel",
    "Sold To Party",
    "BRANCH",
    "Party Code",
    "Ship To Party",
    "Transport Mode",
    "Destination",
    "ROUTE",
]

# Fixed trailing columns after the dynamic RAKE columns.
_TRAILING_HEADERS = [
    "Total",
    "Yes+DO",
    "Blocked",
    "Credit Balance",
    "Required Credit",
    "Credit Note",
]


def _fmt_bool(value: bool | None) -> str:
    if value is None:
        return ""
    return "Yes" if value else "No"


def _fmt_num(value: float | None) -> float | str:
    return "" if value is None else value


def _write_report(ws, report: ReportResponse) -> None:
    """Write pivot rows/subtotals/grand-total rows to *ws*."""
    headers = _FIXED_HEADERS + report.rake_columns + _TRAILING_HEADERS
    ws.append(headers)
    style_header_row(ws[1])

    import openpyxl
    from openpyxl.styles import Font

    bold = Font(bold=True)

    for row in report.rows:
        ws.append(
            [
                row.distr_chnl or "",
                row.sold_to_party or "",
                row.sales_office or "",
                row.party_code,
                row.ship_to_party or "",
                row.transport_mode or "",
                row.destination or "",
                row.route or "",
            ]
            + [row.rake_quantities.get(col, 0.0) or "" for col in report.rake_columns]
            + [
                _fmt_num(row.total),
                _fmt_num(row.nco_yes_do),
                _fmt_bool(row.blocked),
                _fmt_num(row.credit_balance),
                _fmt_num(row.required_credit),
                row.credit_note,
            ]
        )

    # Grand total row
    # Headers: fixed (8) + rake_columns (N) + trailing (6). Credit money is intentionally NOT summed.
    total_row = ["Grand Total"] + [""] * (len(_FIXED_HEADERS) - 1)
    total_row += [""] * len(report.rake_columns)
    total_row += [
        _fmt_num(report.grand_total),
        _fmt_num(report.grand_nco_yes_do),
        "",
        "",
        _fmt_num(report.grand_required_credit),
        "",
    ]
    ws.append(total_row)
    for col in range(1, len(headers) + 1):
        ws.cell(row=ws.max_row, column=col).font = bold


async def export_report(query: ReportQuery) -> bytes:
    """Generate the report and return it as a styled .xlsx workbook."""
    import openpyxl

    report = await generate_report(query)

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Report"

    _write_report(ws, report)

    enable_filters(ws)
    auto_size_columns(ws)

    add_metadata_sheet(
        wb,
        title="Report Export",
        items={
            "Export time": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC"),
            "Report date": query.date,
            "Report type": query.report_type.upper(),
            "Region": report.region_name,
            "Days filter": query.days,
            "CCAs": ", ".join(report.ccas),
            "Has stock": str(report.has_stock),
            "Has credit report": str(report.has_credit_report),
            "Coil price/qty": str(report.coil_price_per_qty) if report.coil_price_per_qty is not None else "Not set",
        },
    )

    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()

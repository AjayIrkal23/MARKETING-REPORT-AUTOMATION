"""Report JSW/JVML business logic: export the generated report as .xlsx."""

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


_HEADERS = [
    "Channel",
    "Party Code",
    "Sold To Party",
    "Ship-To Party",
    "Route",
    "Route Desc",
    "RAKE",
    "Mode of Transport",
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


def _fmt_num(value: float | None) -> float | "":
    return "" if value is None else value


def _write_report(ws, report: ReportResponse) -> None:
    """Write channel/parties/subtotals/grand-total rows to *ws*."""
    ws.append(_HEADERS)
    style_header_row(ws[1])

    import openpyxl
    from openpyxl.styles import Font

    bold = Font(bold=True)

    for channel in report.channels:
        # Channel header row
        ws.append([channel.distr_chnl] + [""] * (len(_HEADERS) - 1))
        header_row = ws.max_row
        ws.merge_cells(
            start_row=header_row, start_column=1, end_row=header_row, end_column=len(_HEADERS)
        )
        ws.cell(row=header_row, column=1).font = bold

        for party in channel.parties:
            ws.append([
                "",
                party.party_code,
                party.sold_to_party or "",
                party.ship_to_party or "",
                party.route or "",
                party.route_desc or "",
                party.rake or "",
                party.transport_mode or "",
                _fmt_num(party.total),
                _fmt_num(party.nco_yes_do),
                _fmt_bool(party.blocked),
                _fmt_num(party.credit_balance),
                _fmt_num(party.required_credit),
                party.credit_note,
            ])

        # Channel subtotal row
        ws.append([
            "",
            "",
            f"{channel.distr_chnl} Total",
            "",
            "",
            "",
            "",
            "",
            _fmt_num(channel.subtotal),
            _fmt_num(channel.subtotal_nco_yes_do),
            "",
            "",
            _fmt_num(channel.subtotal_required_credit),
            "",
        ])
        for col in range(1, len(_HEADERS) + 1):
            ws.cell(row=ws.max_row, column=col).font = bold

    # Grand total row
    ws.append([
        "Grand Total",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        _fmt_num(report.grand_total),
        _fmt_num(report.grand_nco_yes_do),
        "",
        "",
        _fmt_num(report.grand_required_credit),
        "",
    ])
    for col in range(1, len(_HEADERS) + 1):
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

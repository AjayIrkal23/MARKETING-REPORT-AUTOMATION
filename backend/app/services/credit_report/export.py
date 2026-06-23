"""Credit Report domain business logic: export matching rows as an .xlsx workbook."""

from __future__ import annotations

import io
from datetime import datetime, timezone

from ...models.credit_report import CreditReport
from ...models.customer_code import CustomerCode
from ...schemas.credit_report import CreditReportListQuery
from ...utils.credit_report.query import build_credit_report_filter
from ...utils.shared.export_style import (
    add_metadata_sheet,
    auto_size_columns,
    enable_filters,
    style_header_row,
)


_VISIBLE_COLUMNS: list[tuple[str, str]] = [
    ("Report Date", "report_date"),
    ("Customer Name", "customer_name"),
    ("City", "city"),
    ("Customer", "customer"),
    ("Credit Control Area", "credit_control_area"),
    ("CCA Description", "cca_description"),
    ("Blocked", "blocked"),
    ("Currency", "currency"),
    ("CCA Credit Limit", "cca_credit_limit"),
    ("Credit Exposure", "credit_exposure"),
    ("Credit Balance", "credit_balance"),
    ("Overdue", "overdue"),
    ("Total Receivables", "total_receivables"),
]


def _cell_value(doc: CreditReport, attr: str) -> object:
    """Return a printable value for *attr* on *doc*."""
    value = getattr(doc, attr, None)
    return "" if value is None else value


async def export_credit_report(query: CreditReportListQuery) -> bytes:
    """Build and return an .xlsx export of all credit report rows matching *query*.

    Applies the same predicates as ``list_credit_report`` but returns every
    matching row without pagination.
    """
    import openpyxl

    filt = build_credit_report_filter(query)

    if query.region:
        region_docs = await CustomerCode.find({"region_id": query.region}).to_list()
        region_codes = [doc.code for doc in region_docs if doc.code is not None]
        filt["customer"] = {"$in": region_codes if region_codes else [""]}

    docs = await CreditReport.find(filt).sort("+customer").to_list()

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Credit Report"

    headers = [label for label, _ in _VISIBLE_COLUMNS]
    ws.append(headers)
    style_header_row(ws[1])

    for doc in docs:
        ws.append([_cell_value(doc, attr) for _, attr in _VISIBLE_COLUMNS])

    enable_filters(ws)
    auto_size_columns(ws)

    add_metadata_sheet(
        wb,
        title="Credit Report Export",
        items={
            "Export time": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC"),
            "Report date": query.date or "All dates",
            "Region": query.region or "All regions",
            "Plant": query.plant,
            "Rows exported": str(len(docs)),
        },
    )

    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()

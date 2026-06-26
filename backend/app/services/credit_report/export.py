"""Credit Report export — premium single-sheet .xlsx (curated 13-column view)."""

from __future__ import annotations

import io
from datetime import datetime, timezone

from openpyxl.workbook.workbook import Workbook

from ...models.credit_report import CreditReport
from ...models.customer_code import CustomerCode
from ...schemas.credit_report import CreditReportListQuery
from ...utils.credit_report.query import build_credit_report_filter
from ...utils.report.excel_style import add_premium_metadata_sheet
from ...utils.shared.excel_premium import write_records_sheet

SHEET_TITLE = "Credit Report"

# (header, field, format-kind). Money columns use INR; Credit Balance is signed
# (green ≥0 / red <0). Report Date leads (this domain's convention).
_VISIBLE_COLUMNS: list[tuple[str, str, str]] = [
    ("Report Date", "report_date", "text"),
    ("Customer Name", "customer_name", "text"),
    ("City", "city", "text"),
    ("Customer", "customer", "text"),
    ("Credit Control Area", "credit_control_area", "text"),
    ("CCA Description", "cca_description", "text"),
    ("Blocked", "blocked", "center"),
    ("Currency", "currency", "center"),
    ("CCA Credit Limit", "cca_credit_limit", "inr"),
    ("Credit Exposure", "credit_exposure", "inr"),
    ("Credit Balance", "credit_balance", "credit"),
    ("Overdue", "overdue", "inr"),
    ("Total Receivables", "total_receivables", "inr"),
]


def _subtitle(query: CreditReportListQuery, row_count: int) -> str:
    return (
        f"Report Date: {query.date or 'All dates'}  |  Region: {query.region or 'All regions'}  |  "
        f"Rows: {row_count}  |  "
        f"Exported: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}"
    )


async def fetch_credit_report_docs(query: CreditReportListQuery) -> list[CreditReport]:
    """All credit report rows matching *query* (filters + optional region join)."""
    filt = build_credit_report_filter(query)
    if query.region:
        region_docs = await CustomerCode.find({"region_id": query.region}).to_list()
        region_codes = [doc.code for doc in region_docs if doc.code is not None]
        filt["customer"] = {"$in": region_codes if region_codes else [""]}
    return await CreditReport.find(filt).sort("+customer").to_list()


def write_credit_report_sheet(
    wb: Workbook, docs: list[CreditReport], *, subtitle: str
) -> None:
    """Write the premium Credit Report sheet into *wb* (combined report export)."""
    ws = wb.create_sheet(title=SHEET_TITLE)
    write_records_sheet(
        ws,
        banner_title=SHEET_TITLE.upper(),
        subtitle=subtitle,
        columns=_VISIBLE_COLUMNS,
        docs=docs,
        freeze_cols=0,  # no frozen/fixed columns — only the header row is frozen
    )


async def export_credit_report(query: CreditReportListQuery) -> bytes:
    """Standalone premium .xlsx export of all credit report rows matching *query*."""
    import openpyxl

    docs = await fetch_credit_report_docs(query)

    wb = openpyxl.Workbook()
    wb.remove(wb.active)
    write_credit_report_sheet(wb, docs, subtitle=_subtitle(query, len(docs)))

    add_premium_metadata_sheet(
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

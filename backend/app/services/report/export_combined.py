"""Combined report export — one premium .xlsx built from a chosen set of sheets.

Backs ``GET /report/export-combined`` (the /report page sheet-picker dialog). The
user ticks which sheets they want; this assembles exactly those into one workbook,
reusing the same writers the standalone exports use (no duplicated styling/data).

Sheet order (matches the picker): pivot → total rake → all merged breakdowns →
all unmerged breakdowns → JSW → JVML → credit.
"""

from __future__ import annotations

import io
from datetime import datetime, timezone

from ...core.errors import ValidationError
from ...schemas.credit_report import CreditReportListQuery
from ...schemas.jsw_stock import JswStockListQuery
from ...schemas.jvml_stock import JvmlStockListQuery
from ...schemas.report import CombinedExportBody, CombinedExportQuery
from ...utils.report.excel_style import add_premium_metadata_sheet
from ..credit_report.export import fetch_credit_report_docs, write_credit_report_sheet
from ..jsw_stock.export import fetch_jsw_stock_docs, write_jsw_stock_sheet
from ..jvml_stock.export import fetch_jvml_stock_docs, write_jvml_stock_sheet
from ..shared.stock_export import stock_subtitle
from .exclusion import apply_pivot_exclusions, excluded_key_union, filter_stock_docs
from .export import write_pivot_sheet
from .export_totals import write_totals_sheet
from .generate import _resolve_region_customers, generate_report
from .rake_breakdown_export import write_rake_breakdown_sheets

# Valid picker keys → sheets. Frontend hides jsw/jvml that don't match report_type;
# the backend stays permissive (stock sheets are report_type-independent).
COMBINED_SHEET_KEYS = (
    "pivot",
    "rake_totals",
    "rake_merged",
    "rake_unmerged",
    "jsw",
    "jvml",
    "credit",
)


def _parse_sheets(raw: str) -> set[str]:
    """Validate the ``sheets`` CSV → a set of known keys (raises on unknown/empty)."""
    keys = {s.strip() for s in raw.split(",") if s.strip()}
    if not keys:
        raise ValidationError("Select at least one sheet to export.")
    unknown = keys - set(COMBINED_SHEET_KEYS)
    if unknown:
        raise ValidationError(f"Unknown sheet key(s): {', '.join(sorted(unknown))}")
    return keys


async def export_combined(
    query: CombinedExportQuery, body: CombinedExportBody | None = None
) -> bytes:
    """Build the selected sheets into one premium .xlsx and return its bytes.

    ``body.exclusions`` (optional) carries the user's browser-only unchecked RAKE
    drill-down rows (8-field identity keys). Their identities are netted out of the
    pivot, the TOTAL RAKE / TRANSPORT MODE totals (all recomputed from the surviving
    rows), the rake_merged / rake_unmerged breakdown sheets, and the JSW / JVML
    stock sheets. Credit is unaffected.
    """
    import openpyxl

    sheets = _parse_sheets(query.sheets)
    excl = body.exclusions if body is not None else {}
    excluded_keys = excluded_key_union(body)

    # CustomerCode first-doc map — only needed to net excluded identities out of the
    # raw JSW/JVML stock sheets (transport_mode/destination aren't on the stock row).
    first_doc: dict | None = None
    if excluded_keys and sheets & {"jsw", "jvml"}:
        _, _, first_doc, _ = await _resolve_region_customers(query.region_id)

    wb = openpyxl.Workbook()
    wb.remove(wb.active)  # writers create named sheets; drop the empty default

    # The pivot + rake totals both come from one generate_report call.
    report = None
    if sheets & {"pivot", "rake_totals"}:
        report = await generate_report(query)
        apply_pivot_exclusions(report, excluded_keys)  # no-op when none

    if "pivot" in sheets and report is not None:
        visible = None if query.columns is None else {c for c in query.columns.split(",") if c}
        write_pivot_sheet(wb, report, visible, "BRANCH WISE PIVOT REPORT")

    if "rake_totals" in sheets and report is not None:
        subtitle = (
            f"Report Date: {report.date}  |  Region: {report.region_name}  |  "
            f"Days Filter: {report.days_filter}  |  "
            f"Exported: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}"
        )
        # rake_totals / transport_mode_totals already reflect exclusions — they were
        # recomputed from the surviving pivot rows (apply_pivot_exclusions), the
        # trustworthy key-driven source. No exclusions ⇒ untouched totals.
        adj_rows = sorted(report.rake_totals.items())
        write_totals_sheet(
            wb,
            sheet_title="TOTAL RAKE REPORT",
            table_header="RAKE",
            rows=adj_rows,
            subtitle=subtitle,
        )
        # Mirror the on-screen "Total Rake Report" tab: the Transport Mode table is
        # a second sheet under the same pick, recomputed from the surviving rows.
        tm_rows = sorted(report.transport_mode_totals.items())
        write_totals_sheet(
            wb,
            sheet_title="TRANSPORT MODE TOTAL",
            table_header="Transport Mode",
            rows=tm_rows,
            subtitle=subtitle,
        )

    if sheets & {"rake_merged", "rake_unmerged"}:
        await write_rake_breakdown_sheets(
            wb, query,
            merged="rake_merged" in sheets,
            unmerged="rake_unmerged" in sheets,
            exclusions={r: set(e.keys) for r, e in excl.items()} or None,
        )

    if "jsw" in sheets:
        docs = await fetch_jsw_stock_docs(
            JswStockListQuery(date=query.date, region=query.region_id)
        )
        if first_doc is not None:
            docs = filter_stock_docs(docs, first_doc, excluded_keys)
        write_jsw_stock_sheet(
            wb, docs, subtitle=stock_subtitle(query.date, query.region_id, len(docs))
        )

    if "jvml" in sheets:
        docs = await fetch_jvml_stock_docs(
            JvmlStockListQuery(date=query.date, region=query.region_id)
        )
        if first_doc is not None:
            docs = filter_stock_docs(docs, first_doc, excluded_keys)
        write_jvml_stock_sheet(
            wb, docs, subtitle=stock_subtitle(query.date, query.region_id, len(docs))
        )

    if "credit" in sheets:
        docs = await fetch_credit_report_docs(
            CreditReportListQuery(date=query.date, region=query.region_id)
        )
        write_credit_report_sheet(
            wb, docs, subtitle=stock_subtitle(query.date, query.region_id, len(docs))
        )

    if not wb.worksheets:  # defensive — _parse_sheets already guarantees ≥1 key
        raise ValidationError("Nothing to export for the selected sheets.")

    add_premium_metadata_sheet(
        wb,
        title="Combined Report Export",
        items={
            "Export time": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC"),
            "Report date": query.date,
            "Report type": query.report_type.upper(),
            "Region": report.region_name if report is not None else (query.region_id or "All regions"),
            "Days filter": query.days,
            "Sheets": ", ".join(s for s in COMBINED_SHEET_KEYS if s in sheets),
        },
    )

    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()

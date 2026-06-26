"""Shared JSW/JVML stock Excel export — one implementation, two domains.

JSW and JVML stock exports are structurally identical (same 74-column shape, same
Party-Code→region join, same ``+party_code`` sort). This module is the single
source: domains supply their model, filter builder, typed column list and titles.
Both the standalone ``/…/export`` endpoint and the combined report export reuse
``fetch_stock_docs`` + ``write_stock_sheet`` so styling/data logic never forks.
"""

from __future__ import annotations

import io
from collections.abc import Callable
from datetime import datetime, timezone
from typing import Any

from openpyxl.workbook.workbook import Workbook
from openpyxl.worksheet.worksheet import Worksheet

from ...models.customer_code import CustomerCode
from ...utils.report.excel_style import add_premium_metadata_sheet
from ...utils.shared.excel_premium import write_records_sheet

# No frozen/fixed columns in the export — only the header row is frozen.
_FREEZE_COLS = 0


def stock_subtitle(date: str | None, region: str | None, row_count: int) -> str:
    """The banner subtitle line shared by every stock sheet."""
    return (
        f"Report Date: {date or 'All dates'}  |  Region: {region or 'All regions'}  |  "
        f"Rows: {row_count}  |  "
        f"Exported: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}"
    )


async def fetch_stock_docs(
    model: type, build_filter: Callable[[Any], dict[str, Any]], query: Any
) -> list[Any]:
    """All stock rows matching *query* (filters + optional region join), unpaged."""
    filt = build_filter(query)
    if getattr(query, "region", None):
        region_docs = await CustomerCode.find({"region_id": query.region}).to_list()
        filt["customer_code_id"] = {"$in": [str(doc.id) for doc in region_docs]}
    return await model.find(filt).sort("+party_code").to_list()


def write_stock_sheet(
    wb: Workbook,
    *,
    docs: list[Any],
    columns: list[tuple[str, str, str]],
    sheet_title: str,
    subtitle: str,
) -> Worksheet:
    """Add one premium stock sheet (named *sheet_title*) to *wb* and return it."""
    ws = wb.create_sheet(title=sheet_title)
    write_records_sheet(
        ws,
        banner_title=sheet_title.upper(),
        subtitle=subtitle,
        columns=columns,
        docs=docs,
        freeze_cols=_FREEZE_COLS,
    )
    return ws


async def export_stock(
    *,
    model: type,
    build_filter: Callable[[Any], dict[str, Any]],
    query: Any,
    columns: list[tuple[str, str, str]],
    sheet_title: str,
    meta_title: str,
) -> bytes:
    """Standalone single-sheet stock workbook (premium sheet + metadata) as bytes."""
    import openpyxl

    docs = await fetch_stock_docs(model, build_filter, query)

    wb = openpyxl.Workbook()
    wb.remove(wb.active)  # drop the empty default sheet; writers create named sheets
    subtitle = stock_subtitle(getattr(query, "date", None), getattr(query, "region", None), len(docs))
    write_stock_sheet(wb, docs=docs, columns=columns, sheet_title=sheet_title, subtitle=subtitle)

    add_premium_metadata_sheet(
        wb,
        title=meta_title,
        items={
            "Export time": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC"),
            "Report date": getattr(query, "date", None) or "All dates",
            "Region": getattr(query, "region", None) or "All regions",
            "Rows exported": str(len(docs)),
        },
    )

    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()

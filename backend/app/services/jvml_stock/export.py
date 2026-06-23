"""JVML Stock domain business logic: export matching rows as an .xlsx workbook."""

from __future__ import annotations

import io
from datetime import datetime, timezone

from ...models.customer_code import CustomerCode
from ...models.jvml_stock import JvmlStock
from ...schemas.jvml_stock import JvmlStockListQuery
from ...utils.jvml_stock.query import build_jvml_stock_filter
from ...utils.shared.export_style import (
    add_metadata_sheet,
    auto_size_columns,
    enable_filters,
    style_header_row,
)


_VISIBLE_COLUMNS: list[tuple[str, str]] = [
    ("Report Date", "report_date"),
    ("Party Code", "party_code"),
    ("Customer Name", "customer_name"),
    ("Sold To Party", "sold_to_party"),
    ("Material", "material"),
    ("JSW Grade", "jsw_grade"),
    ("Sales Office", "sales_office"),
    ("Distr.Chnl", "distr_chnl"),
    ("Unrestr Qty", "unrestr_qty"),
    ("Stock Qty", "stock_quantity"),
]


def _cell_value(doc: JvmlStock, attr: str) -> object:
    """Return a printable value for *attr* on *doc*."""
    value = getattr(doc, attr, None)
    return "" if value is None else value


async def export_jvml_stock(query: JvmlStockListQuery) -> bytes:
    """Build and return an .xlsx export of all JVML stock rows matching *query*.

    Applies the same predicates as ``list_jvml_stock`` but returns every
    matching row without pagination. Only the columns shown in the JVML Stock
    list table are exported.
    """
    import openpyxl

    filt = build_jvml_stock_filter(query)

    if query.region:
        region_docs = await CustomerCode.find({"region_id": query.region}).to_list()
        region_ids = [str(doc.id) for doc in region_docs]
        filt["customer_code_id"] = {"$in": region_ids}

    docs = await JvmlStock.find(filt).sort("+party_code").to_list()

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "JVML Stock"

    headers = [label for label, _ in _VISIBLE_COLUMNS]
    ws.append(headers)
    style_header_row(ws[1])

    for doc in docs:
        ws.append([_cell_value(doc, attr) for _, attr in _VISIBLE_COLUMNS])

    enable_filters(ws)
    auto_size_columns(ws)

    add_metadata_sheet(
        wb,
        title="JVML Stock Export",
        items={
            "Export time": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC"),
            "Report date": query.date or "All dates",
            "Region": query.region or "All regions",
            "Rows exported": str(len(docs)),
        },
    )

    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()

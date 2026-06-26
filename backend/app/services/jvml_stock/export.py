"""JVML Stock export — thin shim over the shared stock export (premium .xlsx)."""

from __future__ import annotations

from ...models.jvml_stock import JvmlStock
from ...schemas.jvml_stock import JvmlStockListQuery
from ...utils.jvml_stock.columns import COLUMNS
from ...utils.jvml_stock.query import build_jvml_stock_filter
from ..shared.stock_export import export_stock, fetch_stock_docs, write_stock_sheet

SHEET_TITLE = "JVML Stock"

# (header, field, format-kind) — see jsw_stock/export.py for the mapping rules.
_EXPORT_COLUMNS: list[tuple[str, str, str]] = [
    *[
        (
            "Party Code (Normalized)" if field == "party_code" else header,
            "party_code_normalized" if field == "party_code" else field,
            "num" if ctype == "number" else "date" if ctype == "date" else "text",
        )
        for header, field, ctype in COLUMNS
    ],
    ("Customer Name", "customer_name", "text"),
    ("Report Date", "report_date", "text"),
]


async def fetch_jvml_stock_docs(query: JvmlStockListQuery) -> list[JvmlStock]:
    """All JVML stock rows matching *query* (for the combined report export)."""
    return await fetch_stock_docs(JvmlStock, build_jvml_stock_filter, query)


def write_jvml_stock_sheet(wb, docs: list[JvmlStock], *, subtitle: str) -> None:
    """Write the premium JVML Stock sheet into *wb* (combined report export)."""
    write_stock_sheet(
        wb, docs=docs, columns=_EXPORT_COLUMNS, sheet_title=SHEET_TITLE, subtitle=subtitle
    )


async def export_jvml_stock(query: JvmlStockListQuery) -> bytes:
    """Standalone premium .xlsx export of all JVML stock rows matching *query*."""
    return await export_stock(
        model=JvmlStock,
        build_filter=build_jvml_stock_filter,
        query=query,
        columns=_EXPORT_COLUMNS,
        sheet_title=SHEET_TITLE,
        meta_title="JVML Stock Export",
    )

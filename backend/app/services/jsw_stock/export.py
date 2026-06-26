"""JSW Stock export — thin shim over the shared stock export (premium .xlsx)."""

from __future__ import annotations

from ...models.jsw_stock import JswStock
from ...schemas.jsw_stock import JswStockListQuery
from ...utils.jsw_stock.columns import COLUMNS
from ...utils.jsw_stock.query import build_jsw_stock_filter
from ..shared.stock_export import export_stock, fetch_stock_docs, write_stock_sheet

SHEET_TITLE = "JSW Stock"

# (header, field, format-kind). Source `number`→`num` (keeps decimals),
# `date`→`date`; Party Code is exported normalized (leading zeros stripped),
# then the resolved Customer Name + Report Date are appended. System columns
# (id, row_hash, customer_code_id, source_file, created_at) are excluded.
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


async def fetch_jsw_stock_docs(query: JswStockListQuery) -> list[JswStock]:
    """All JSW stock rows matching *query* (for the combined report export)."""
    return await fetch_stock_docs(JswStock, build_jsw_stock_filter, query)


def write_jsw_stock_sheet(wb, docs: list[JswStock], *, subtitle: str) -> None:
    """Write the premium JSW Stock sheet into *wb* (combined report export)."""
    write_stock_sheet(
        wb, docs=docs, columns=_EXPORT_COLUMNS, sheet_title=SHEET_TITLE, subtitle=subtitle
    )


async def export_jsw_stock(query: JswStockListQuery) -> bytes:
    """Standalone premium .xlsx export of all JSW stock rows matching *query*."""
    return await export_stock(
        model=JswStock,
        build_filter=build_jsw_stock_filter,
        query=query,
        columns=_EXPORT_COLUMNS,
        sheet_title=SHEET_TITLE,
        meta_title="JSW Stock Export",
    )

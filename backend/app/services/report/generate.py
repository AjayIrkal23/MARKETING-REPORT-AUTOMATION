"""Report JSW/JVML orchestrator — region → codes → RAKE pivot → credit → assemble.

See ``.planning/report-jsw-jvml/SPEC.md`` §2 for the algorithm. All business
booleans (``has_stock``, ``has_credit_report``, ``blocked``, ``credit_status``)
are decided here so the frontend only renders.
"""

from __future__ import annotations

from typing import Any

from ...models.customer_code import CustomerCode
from ...models.jsw_stock import JswStock
from ...models.jvml_stock import JvmlStock
from ...schemas.report import (
    ReportPivotRow,
    ReportQuery,
    ReportResponse,
)
from ...services.customer_code.region_link import resolve_region_or_400
from ...utils.credit_report.query import _PLANT_CCA_MAP
from ...utils.report.normalize import normalize_code
from .credit import build_credit_map, coil_price_per_qty
from .pivot import aggregate_pivot

# Report type → (stock model, credit control areas).
_REPORT_MAP: dict[str, tuple[type, list[str]]] = {
    "jsw": (JswStock, _PLANT_CCA_MAP["jsw"]),
    "jvml": (JvmlStock, _PLANT_CCA_MAP["jvml"]),
}

# Row field display order; blank/null values sort as empty strings.
# BRANCH (sales_office) sits right after Distr. Channel so each unique branch
# heads its items (grouped pivot column), above Sold To Party.
_ROW_SORT_KEYS = (
    "so_sales_org",
    "distr_chnl",
    "sales_office",
    "sold_to_party",
    "party_code",
    "ship_to_party",
    "transport_mode",
    "destination",
    "route",
)


async def _resolve_region_customers(
    region_id: str | None,
) -> tuple[str, set[str], dict[str, CustomerCode], list[str]]:
    """Resolve region → (region_name, normalized codes, first-doc map, all RAKEs).

    Empty *region_id* ⇒ all regions / all customer codes. A non-empty but
    invalid id raises ``ValidationError`` (400) via ``resolve_region_or_400``.

    Returns:
        - region_name
        - set of normalized customer codes
        - dict mapping normalized code → first ``CustomerCode`` document
          (used for enrichment; ``ship_to_customer`` trailing space is stripped
          before the doc is stored, but we still defensively strip strings here)
        - sorted list of all unique ``rake`` values across the selected docs
    """
    if region_id:
        region = await resolve_region_or_400(region_id)
        region_name = region.name
        docs = await CustomerCode.find({"region_id": region_id}).to_list()
    else:
        region_name = "All Regions"
        docs = await CustomerCode.find({}).to_list()

    codes: set[str] = set()
    first_doc: dict[str, CustomerCode] = {}
    rakes: set[str] = set()

    for doc in docs:
        nc = normalize_code(doc.code)
        if not nc:
            continue
        codes.add(nc)
        if nc not in first_doc:
            first_doc[nc] = doc
        if doc.rake:
            rake_val = doc.rake.strip()
            if rake_val:
                rakes.add(rake_val)

    return region_name, codes, first_doc, sorted(rakes)


def _strip_or_none(value: object | None) -> str | None:
    """Return a stripped non-empty string, or ``None``."""
    if value is None:
        return None
    s = str(value).strip()
    return s if s else None


def _augment_credit(
    total: float,
    nco_yes_do: float,
    party_key: str,
    has_credit_report: bool,
    credit_map: dict[str, dict[str, Any]],
    price_per_qty: float | None,
) -> dict[str, Any]:
    """Compute the per-row credit columns (required credit + status/blocked)."""
    required = (
        (total - nco_yes_do) * price_per_qty if price_per_qty is not None else None
    )

    if not has_credit_report:
        return {
            "blocked": None, "credit_balance": None, "required_credit": required,
            "credit_sufficient": None, "credit_status": "NO CREDIT REPORT FOUND",
            "credit_note": "NO CREDIT REPORT FOUND",
        }

    entry = credit_map.get(party_key)
    balance = entry["credit_balance"] if entry else None
    if entry is None or balance is None:
        return {
            "blocked": entry["blocked"] if entry else None,
            "credit_balance": None, "required_credit": required,
            "credit_sufficient": None, "credit_status": "No Credit balance",
            "credit_note": "No Credit balance",
        }

    sufficient = balance >= required if required is not None else None
    if balance < 0:
        note = "Balance Negative"
    elif sufficient is False:
        note = "Not Enough Balance"
    else:
        note = "Balance Available"  # sufficient True, or no required to compare
    return {
        "blocked": entry["blocked"], "credit_balance": balance,
        "required_credit": required, "credit_sufficient": sufficient,
        "credit_status": "", "credit_note": note,
    }


def _compute_totals(
    rows: list[ReportPivotRow],
) -> tuple[dict[str, float], dict[str, float]]:
    """Compute RAKE totals and transport-mode totals from pivot rows."""
    rake_totals: dict[str, float] = {}
    tm_totals: dict[str, float] = {}
    for row in rows:
        for rake, qty in row.rake_quantities.items():
            if qty:
                rake_totals[rake] = rake_totals.get(rake, 0.0) + qty
        tm = row.transport_mode or "Unknown"
        tm_totals[tm] = tm_totals.get(tm, 0.0) + row.total
    return rake_totals, tm_totals


def _filter_used_rakes(
    rows: list[ReportPivotRow], rake_columns: list[str]
) -> list[str]:
    """Keep only RAKE columns that carry a non-zero value in at least one row.

    A region can declare dozens of RAKEs in ``customer_codes`` while a given
    date's stock only moves a handful — the rest render as all-dash columns.
    Drop those empty columns and prune each surviving row's ``rake_quantities``
    to the kept set so the table/export/payload stay lean. Returns the filtered,
    order-preserving column list.
    """
    used = {col for row in rows for col, qty in row.rake_quantities.items() if qty}
    kept = [c for c in rake_columns if c in used]
    if kept != rake_columns:
        for row in rows:
            row.rake_quantities = {c: row.rake_quantities.get(c, 0.0) for c in kept}
    return kept


def _build_pivot_rows(
    rows: list[dict[str, Any]],
    has_credit_report: bool,
    credit_map: dict[str, dict[str, Any]],
    price_per_qty: float | None,
    customer_map: dict[str, CustomerCode],
    rake_columns: list[str],
) -> list[ReportPivotRow]:
    """Turn aggregation rows into enriched RAKE-pivot rows."""
    pivot_rows: list[ReportPivotRow] = []

    for row in rows:
        ident = row["_id"]
        party_key = ident["party"]
        total = float(row.get("total") or 0.0)
        nco_yes_do = float(row.get("nco_yes_do") or 0.0)

        credit = _augment_credit(
            total, nco_yes_do, party_key, has_credit_report, credit_map, price_per_qty
        )

        doc = customer_map.get(party_key)
        if doc:
            rake = _strip_or_none(doc.rake)
            transport_mode = _strip_or_none(doc.transport_mode)
            destination = _strip_or_none(doc.destination)
            route = _strip_or_none(doc.route)
        else:
            rake = transport_mode = destination = route = None

        rake_quantities = {col: 0.0 for col in rake_columns}
        if rake and rake in rake_quantities:
            rake_quantities[rake] = total

        pivot_rows.append(
            ReportPivotRow(
                so_sales_org=ident.get("so_sales_org"),
                distr_chnl=ident.get("distr_chnl"),
                sold_to_party=ident.get("sold_to_party"),
                sales_office=ident.get("sales_office"),
                party_code=party_key,
                ship_to_party=ident.get("ship_to_party"),
                customer_name=_strip_or_none(ident.get("customer_name")),
                transport_mode=transport_mode,
                destination=destination,
                route=route,
                rake_quantities=rake_quantities,
                total=total,
                nco_yes_do=nco_yes_do,
                nco_yes_do_count=int(row.get("nco_yes_do_count") or 0),
                **credit,
            )
        )

    # Stable sort by the row-field tuple.
    pivot_rows.sort(
        key=lambda r: tuple(
            (getattr(r, k) or "").lower() for k in _ROW_SORT_KEYS
        )
    )
    return pivot_rows


async def _generate_single(report_type: str, query: ReportQuery) -> ReportResponse:
    """Build the RAKE-pivot payload for one stock model (``jsw`` or ``jvml``)."""
    stock_model, ccas = _REPORT_MAP[report_type]

    region_name, normalized_codes, customer_map, rake_columns = await _resolve_region_customers(
        query.region_id
    )
    price_per_qty = await coil_price_per_qty()

    has_stock = await stock_model.find({"report_date": query.date}).count() > 0
    has_credit_report, credit_map = await build_credit_map(query.date, ccas)

    pivot_rows: list[ReportPivotRow] = []
    if has_stock and normalized_codes:
        rows = await aggregate_pivot(
            stock_model, query.date, list(normalized_codes), query.days
        )
        pivot_rows = _build_pivot_rows(
            rows, has_credit_report, credit_map, price_per_qty, customer_map, rake_columns
        )
        # Show only RAKE columns that actually moved stock (drop all-dash columns).
        rake_columns = _filter_used_rakes(pivot_rows, rake_columns)

    grand_req = [
        r.required_credit for r in pivot_rows if r.required_credit is not None
    ]
    rake_totals, tm_totals = _compute_totals(pivot_rows)
    return ReportResponse(
        date=query.date,
        report_type=report_type,
        region_id=query.region_id,
        region_name=region_name,
        days_filter=query.days,
        ccas=ccas,
        has_stock=has_stock,
        has_credit_report=has_credit_report,
        coil_price_per_qty=price_per_qty,
        rake_columns=rake_columns,
        rows=pivot_rows,
        grand_total=sum(r.total for r in pivot_rows),
        grand_nco_yes_do=sum(r.nco_yes_do for r in pivot_rows),
        grand_required_credit=sum(grand_req) if grand_req else None,
        rake_totals=rake_totals,
        transport_mode_totals=tm_totals,
    )


def _merge_reports(query: ReportQuery, parts: list[ReportResponse]) -> ReportResponse:
    """Merge per-type reports into one ``report_type="both"`` payload.

    Rows from every part are concatenated and re-sorted by the full hierarchy
    tuple (which starts with ``so_sales_org``), so the frontend/export group by
    SO Sales Org over the contiguous result. Each row keeps its own already-
    computed credit columns and RAKE quantities; ``rake_columns`` is the union.
    """
    rows: list[ReportPivotRow] = [r for p in parts for r in p.rows]
    rows.sort(key=lambda r: tuple((getattr(r, k) or "").lower() for k in _ROW_SORT_KEYS))
    rake_columns = sorted({c for p in parts for c in p.rake_columns})
    grand_req = [r.required_credit for r in rows if r.required_credit is not None]
    coil = next((p.coil_price_per_qty for p in parts if p.coil_price_per_qty is not None), None)
    rake_totals, tm_totals = _compute_totals(rows)

    return ReportResponse(
        date=query.date,
        report_type="both",
        region_id=query.region_id,
        region_name=parts[0].region_name,
        days_filter=query.days,
        ccas=[c for p in parts for c in p.ccas],
        has_stock=any(p.has_stock for p in parts),
        has_credit_report=all(p.has_credit_report for p in parts),
        coil_price_per_qty=coil,
        rake_columns=rake_columns,
        rows=rows,
        grand_total=sum(r.total for r in rows),
        grand_nco_yes_do=sum(r.nco_yes_do for r in rows),
        grand_required_credit=sum(grand_req) if grand_req else None,
        rake_totals=rake_totals,
        transport_mode_totals=tm_totals,
    )


async def generate_report(query: ReportQuery) -> ReportResponse:
    """Build the RAKE-pivot Report JSW/JVML payload for *query*.

    ``report_type="both"`` runs jsw + jvml and merges them into one response
    grouped by SO Sales Org; a single type returns that type's report directly.
    """
    if query.report_type == "both":
        jsw = await _generate_single("jsw", query)
        jvml = await _generate_single("jvml", query)
        return _merge_reports(query, [jsw, jvml])
    return await _generate_single(query.report_type, query)

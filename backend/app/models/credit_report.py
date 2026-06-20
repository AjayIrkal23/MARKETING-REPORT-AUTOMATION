"""CreditReport document model (MongoDB collection ``credit_report``, via Beanie)."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Annotated

from beanie import Document, Indexed
from pydantic import Field


def _now_utc() -> datetime:
    """Return the current UTC datetime (used as a :func:`~pydantic.Field` default factory)."""
    return datetime.now(timezone.utc)


class CreditReport(Document):
    """A single row from the SAP Credit Management Excel workbook (33 data cols + 4 meta cols).

    Collection ``credit_report``. Ingested by the APScheduler poll job; queried by
    the Credit Report List page. Scoped to Credit Control Areas JV0H / VJ0H only.
    No customer-mapping join — ``customer_name`` is native to the source report.
    """

    # ------------------------------------------------------------------
    # §1 data fields — Customer identity (cols 1-6, text, filter-indexed)
    # ------------------------------------------------------------------
    customer_name:        Annotated[str | None, Indexed()] = None
    """Customer Name (col 1). Native name from SAP; filter-indexed."""
    city:                 Annotated[str | None, Indexed()] = None
    """City (col 2). Customer city; filter-indexed."""
    customer:             Annotated[str | None, Indexed()] = None
    """Customer (col 3). SAP customer code; filter-indexed."""
    credit_control_area:  Annotated[str | None, Indexed()] = None
    """Credit Control Area (col 4). Ingestion gate: only JV0H / VJ0H kept; filter-indexed."""
    cca_description:      Annotated[str | None, Indexed()] = None
    """CCA Description (col 5). Human-readable CCA label; filter-indexed."""
    blocked:              Annotated[str | None, Indexed()] = None
    """Blocked (col 6). Text — 'X' when blocked, None/empty when not; filter-indexed."""

    # ------------------------------------------------------------------
    # §1 data fields — Currency + credit limits (cols 7-10, text/number)
    # ------------------------------------------------------------------
    currency:              str | None = None
    """Currency (col 7). ISO currency code, e.g. INR."""
    cca_credit_limit:      float | None = None
    """CCA Credit Limit (col 8). Total credit limit for this CCA. number."""
    credit_proposal_number: str | None = None
    """Credit Proposal number (col 9). SAP proposal reference. text."""
    proposed_value:        float | None = None
    """Proposed Value (col 10). Proposed credit limit value. number."""

    # ------------------------------------------------------------------
    # §1 data fields — Exposure & balance (cols 11-14, number, filter-indexed)
    # ------------------------------------------------------------------
    credit_exposure:       float | None = None
    """Credit Exposure (col 11). Outstanding credit exposure. number."""
    credit_balance:        Annotated[float | None, Indexed()] = None
    """Credit Balance (col 12). Available credit balance; negative = over limit; filter-indexed."""
    overdue:               float | None = None
    """Overdue (col 13). Overdue amount. number."""
    sales_value:           float | None = None
    """Sales value (col 14). Open sales value. number."""

    # ------------------------------------------------------------------
    # §1 data fields — Receivables & liabilities (cols 15-22, number)
    # ------------------------------------------------------------------
    total_receivables:          float | None = None
    """Total receivables (col 15). number."""
    special_liabilities:        float | None = None
    """Special liabilities (col 16). number."""
    open_delivery_credit:       float | None = None
    """Open delivery credit (col 17). number."""
    open_bill_doc_credit:       float | None = None
    """Open bill.doc.credit (col 18). number."""
    open_orders_credit:         float | None = None
    """Open orders credit (col 19). number."""
    guaranteed_open_delivery:   float | None = None
    """Guaranteed open delivery (col 20). number."""
    guarantd_open_billing_docs: float | None = None
    """Guarantd open billing docs (col 21). number — source header spelling preserved."""
    guaranteed_open_orders:     float | None = None
    """Guaranteed open orders (col 22). number."""

    # ------------------------------------------------------------------
    # §1 data fields — Validity & risk (cols 23-26, date/text/number)
    # ------------------------------------------------------------------
    validity_period_start:  datetime | None = None
    """Validity Per. Start (col 23). date — Excel serial via epoch 1899-12-30."""
    validity_period_end:    datetime | None = None
    """Validity Period End (col 24). date — Excel serial; '#VALUE!' → None."""
    risk_category:          str | None = None
    """Risk category (col 25). SAP risk classification. text."""
    total_amount:           float | None = None
    """Total amount (col 26). number."""

    # ------------------------------------------------------------------
    # §1 data fields — Individual limit (col 27, number)
    # ------------------------------------------------------------------
    individual_limit:       float | None = None
    """Individual limit (col 27). Customer-level credit limit override. number."""

    # ------------------------------------------------------------------
    # §1 data fields — Sales organisation hierarchy (cols 28-33, text)
    # ------------------------------------------------------------------
    sales_organization:     str | None = None
    """Sales Organization (col 28). text."""
    distribution_channel:   str | None = None
    """Distribution Channel (col 29). text."""
    division:               str | None = None
    """Division (col 30). text."""
    sales_group:            str | None = None
    """Sales Group (col 31). text."""
    sales_office:           str | None = None
    """Sales Office (col 32). text."""
    hierarchy_customer:     str | None = None
    """Hierarchy Customer (col 33). SAP customer hierarchy node. text."""

    # ------------------------------------------------------------------
    # Internal duplicate-detection hash
    # ------------------------------------------------------------------
    row_hash:               Annotated[str | None, Indexed()] = None
    """Deterministic hash of the source row — used for same-date deduplication."""

    # ------------------------------------------------------------------
    # Meta fields (4 total — no party_code_normalized / customer_code_id)
    # ------------------------------------------------------------------
    report_date:  Annotated[str, Indexed()]
    """Source folder date string dd-mm-yyyy (e.g. '31-05-2026')."""
    source_file:  str | None = None
    """Absolute path the row was ingested from."""
    created_at:   Annotated[datetime, Indexed()] = Field(default_factory=_now_utc)
    """UTC insert timestamp — used as the default sort field."""
    updated_at:   datetime = Field(default_factory=_now_utc)
    """UTC timestamp bumped on re-ingest (delete + re-insert cycle)."""

    class Settings:
        name = "credit_report"

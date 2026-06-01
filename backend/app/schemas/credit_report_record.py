"""Credit Report public record DTO — used for both list rows and the detail sheet.

CreditReportPublic carries all 33 Excel columns + 4 meta fields.
Type mapping per SPEC §1:
  text   -> str | None
  number -> float | None
  date   -> datetime | None   (validity_period_start, validity_period_end)

Field order matches SPEC §1 column order (1-based) then meta fields.
No party_code_normalized / customer_code_id mapping fields — the file has a
native customer_name column.
"""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel


class CreditReportPublic(BaseModel):
    """Public representation of a CreditReport document (list row + detail sheet)."""

    id: str

    # --- §1 33 data columns ---
    customer_name: str | None = None
    city: str | None = None
    customer: str | None = None
    credit_control_area: str | None = None
    cca_description: str | None = None
    blocked: str | None = None
    currency: str | None = None
    cca_credit_limit: float | None = None
    credit_proposal_number: str | None = None
    proposed_value: float | None = None
    credit_exposure: float | None = None
    credit_balance: float | None = None
    overdue: float | None = None
    sales_value: float | None = None
    total_receivables: float | None = None
    special_liabilities: float | None = None
    open_delivery_credit: float | None = None
    open_bill_doc_credit: float | None = None
    open_orders_credit: float | None = None
    guaranteed_open_delivery: float | None = None
    guarantd_open_billing_docs: float | None = None
    guaranteed_open_orders: float | None = None
    validity_period_start: datetime | None = None
    validity_period_end: datetime | None = None
    risk_category: str | None = None
    total_amount: float | None = None
    individual_limit: float | None = None
    sales_organization: str | None = None
    distribution_channel: str | None = None
    division: str | None = None
    sales_group: str | None = None
    sales_office: str | None = None
    hierarchy_customer: str | None = None

    # --- 4 meta fields ---
    report_date: str                              # dd-mm-yyyy, always set
    source_file: str | None = None
    created_at: datetime
    updated_at: datetime

"""CreditReport document -> public DTO serialisation. No I/O, no side-effects.

id = str(doc.id) — ObjectId never leaks to callers (api-contract-standards, owasp-security).
All 33 Excel columns + 4 meta fields mapped directly.
No customer mapping fields — credit report has a native Customer Name column.
"""
from __future__ import annotations

from typing import TYPE_CHECKING

from ...schemas.credit_report_record import CreditReportPublic

if TYPE_CHECKING:
    from ...models.credit_report import CreditReport


def to_credit_report_public(doc: "CreditReport") -> CreditReportPublic:
    """Map a CreditReport document to CreditReportPublic.

    id = str(doc.id) — ObjectId never leaks to callers.
    All 33 domain fields + 4 meta fields mapped directly.
    No customer mapping fields (customer_name is a native Excel column).
    """
    return CreditReportPublic(
        id=str(doc.id),
        # ---------------------------------------------------------------
        # Excel columns 1–33 (pass through; types guaranteed by model)
        # ---------------------------------------------------------------
        # Col 1 — Customer Name
        customer_name=doc.customer_name,
        # Col 2 — City
        city=doc.city,
        # Col 3 — Customer
        customer=doc.customer,
        # Col 4 — Credit control area
        credit_control_area=doc.credit_control_area,
        # Col 5 — CCA Description
        cca_description=doc.cca_description,
        # Col 6 — Blocked
        blocked=doc.blocked,
        # Col 7 — Currency
        currency=doc.currency,
        # Col 8 — CCA Credit Limit [number]
        cca_credit_limit=doc.cca_credit_limit,
        # Col 9 — Credit Proposal number
        credit_proposal_number=doc.credit_proposal_number,
        # Col 10 — Proposed Value [number]
        proposed_value=doc.proposed_value,
        # Col 11 — Credit Exposure [number]
        credit_exposure=doc.credit_exposure,
        # Col 12 — Credit Balance [number]
        credit_balance=doc.credit_balance,
        # Col 13 — Overdue [number]
        overdue=doc.overdue,
        # Col 14 — Sales value [number]
        sales_value=doc.sales_value,
        # Col 15 — Total receivables [number]
        total_receivables=doc.total_receivables,
        # Col 16 — Special liabilities [number]
        special_liabilities=doc.special_liabilities,
        # Col 17 — Open delivery credit [number]
        open_delivery_credit=doc.open_delivery_credit,
        # Col 18 — Open bill.doc.credit [number]
        open_bill_doc_credit=doc.open_bill_doc_credit,
        # Col 19 — Open orders credit [number]
        open_orders_credit=doc.open_orders_credit,
        # Col 20 — Guaranteed open delivery [number]
        guaranteed_open_delivery=doc.guaranteed_open_delivery,
        # Col 21 — Guarantd open billing docs [number]
        guarantd_open_billing_docs=doc.guarantd_open_billing_docs,
        # Col 22 — Guaranteed open orders [number]
        guaranteed_open_orders=doc.guaranteed_open_orders,
        # Col 23 — Validity Per. Start [date]
        validity_period_start=doc.validity_period_start,
        # Col 24 — Validity Period End [date]
        validity_period_end=doc.validity_period_end,
        # Col 25 — Risk category
        risk_category=doc.risk_category,
        # Col 26 — Total amount [number]
        total_amount=doc.total_amount,
        # Col 27 — Individual limit [number]
        individual_limit=doc.individual_limit,
        # Col 28 — Sales Organization
        sales_organization=doc.sales_organization,
        # Col 29 — Distribution Channel
        distribution_channel=doc.distribution_channel,
        # Col 30 — Division
        division=doc.division,
        # Col 31 — Sales Group
        sales_group=doc.sales_group,
        # Col 32 — Sales Office
        sales_office=doc.sales_office,
        # Col 33 — Hierarchy Customer
        hierarchy_customer=doc.hierarchy_customer,
        # ---------------------------------------------------------------
        # Meta fields (appended at ingestion time)
        # ---------------------------------------------------------------
        report_date=doc.report_date,
        source_file=doc.source_file,
        created_at=doc.created_at,
        updated_at=doc.updated_at,
    )

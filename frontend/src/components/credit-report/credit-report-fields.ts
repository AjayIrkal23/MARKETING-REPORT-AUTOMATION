/**
 * credit-report-fields.ts
 *
 * Data-only config (NO React imports) driving ViewCreditReportDialog.
 * Covers all 33 source columns + 4 meta fields in 6 logical groups.
 *
 * kind values:
 *   "text"     — string | null, render as-is
 *   "money"    — number | null, fmtINR (Indian grouping, ₹ prefix, sign colour)
 *   "number"   — number | null, toLocaleString
 *   "date"     — ISO date string | null, format as date only
 *   "datetime" — ISO datetime string | null, format with time
 *   "mono"     — string | null, render in monospace (codes / IDs)
 */

import type { CreditReport } from "@/types/credit-report/credit-report"

export interface FieldDef {
  key: keyof CreditReport
  label: string
  kind: "text" | "number" | "money" | "date" | "datetime" | "mono"
}

export interface FieldGroup {
  group: string
  fields: FieldDef[]
}

export const CREDIT_REPORT_FIELD_GROUPS: FieldGroup[] = [
  {
    group: "Customer",
    fields: [
      { key: "customer_name",        label: "Customer Name",        kind: "text" },
      { key: "city",                 label: "City",                 kind: "text" },
      { key: "customer",             label: "Customer",             kind: "mono" },
      { key: "credit_control_area",  label: "Credit Control Area",  kind: "mono" },
      { key: "cca_description",      label: "CCA Description",      kind: "text" },
      { key: "blocked",              label: "Blocked",              kind: "text" },
      { key: "currency",             label: "Currency",             kind: "text" },
    ],
  },
  {
    group: "Credit Limits & Exposure",
    fields: [
      { key: "cca_credit_limit",       label: "CCA Credit Limit",       kind: "money" },
      { key: "credit_exposure",        label: "Credit Exposure",        kind: "money" },
      { key: "credit_balance",         label: "Credit Balance",         kind: "money" },
      { key: "overdue",                label: "Overdue",                kind: "money" },
      { key: "proposed_value",         label: "Proposed Value",         kind: "money" },
      { key: "credit_proposal_number", label: "Credit Proposal Number", kind: "text"  },
      { key: "total_amount",           label: "Total Amount",           kind: "money" },
      { key: "individual_limit",       label: "Individual Limit",       kind: "money" },
    ],
  },
  {
    group: "Receivables & Liabilities",
    fields: [
      { key: "sales_value",                 label: "Sales Value",                  kind: "money" },
      { key: "total_receivables",           label: "Total Receivables",            kind: "money" },
      { key: "special_liabilities",         label: "Special Liabilities",          kind: "money" },
      { key: "open_delivery_credit",        label: "Open Delivery Credit",         kind: "money" },
      { key: "open_bill_doc_credit",        label: "Open Bill Doc Credit",         kind: "money" },
      { key: "open_orders_credit",          label: "Open Orders Credit",           kind: "money" },
      { key: "guaranteed_open_delivery",    label: "Guaranteed Open Delivery",     kind: "money" },
      { key: "guarantd_open_billing_docs",  label: "Guaranteed Open Billing Docs", kind: "money" },
      { key: "guaranteed_open_orders",      label: "Guaranteed Open Orders",       kind: "money" },
    ],
  },
  {
    group: "Validity & Risk",
    fields: [
      { key: "validity_period_start", label: "Validity Period Start", kind: "date" },
      { key: "validity_period_end",   label: "Validity Period End",   kind: "date" },
      { key: "risk_category",         label: "Risk Category",         kind: "text" },
    ],
  },
  {
    group: "Sales Org",
    fields: [
      { key: "sales_organization",  label: "Sales Organization",  kind: "text" },
      { key: "distribution_channel", label: "Distribution Channel", kind: "text" },
      { key: "division",            label: "Division",            kind: "text" },
      { key: "sales_group",         label: "Sales Group",         kind: "text" },
      { key: "sales_office",        label: "Sales Office",        kind: "text" },
      { key: "hierarchy_customer",  label: "Hierarchy Customer",  kind: "mono" },
    ],
  },
  {
    group: "Meta",
    fields: [
      { key: "report_date", label: "Report Date", kind: "text"     },
      { key: "source_file", label: "Source File", kind: "text"     },
      { key: "created_at",  label: "Ingested",    kind: "datetime" },
      { key: "updated_at",  label: "Updated",     kind: "datetime" },
    ],
  },
]

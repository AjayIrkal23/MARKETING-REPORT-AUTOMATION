/**
 * Credit Report domain types — aligned with backend `credit_report` domain.
 * SPEC: .planning/credit-report/SPEC.md §1 + §7.
 * 33 columns from SAP Credit Management report (`credit report.XLSX`).
 * Filter surface: 4 async-select + 2 enum selects (no q, no date-range).
 */
import type { PageQuery } from "@/types/api/envelope"

/** Whitelisted sort keys — must match backend CreditReportSortBy Literal exactly. */
export type CreditReportSortBy =
  | "created_at"
  | "report_date"
  | "customer_name"
  | "city"
  | "customer"
  | "credit_control_area"
  | "cca_description"
  | "blocked"
  | "cca_credit_limit"
  | "credit_exposure"
  | "credit_balance"
  | "overdue"
  | "total_receivables"

/** 4 async-select filterable field names — must match backend CreditReportField Literal exactly. */
export type CreditReportField =
  | "customer_name"
  | "city"
  | "customer"
  | "cca_description"

/**
 * Single Credit Report row — mirrors backend CreditReportPublic schema.
 * text → string|null, number → number|null.
 * date cols (validity_period_start, validity_period_end) → string|null (ISO-8601).
 * No party_code_normalized / customer_code_id mapping fields (native Customer Name column).
 */
export interface CreditReport {
  id: string
  // --- §1 33 columns ---
  customer_name: string | null           // col 1  text   filter (async-select)
  city: string | null                    // col 2  text   filter (async-select)
  customer: string | null                // col 3  text   filter (async-select)
  credit_control_area: string | null     // col 4  text   (JV0H / VJ0H gate)
  cca_description: string | null         // col 5  text   filter (async-select)
  blocked: string | null                 // col 6  text   "X" or null; filter enum
  currency: string | null                // col 7  text
  cca_credit_limit: number | null        // col 8  number money
  credit_proposal_number: string | null  // col 9  text
  proposed_value: number | null          // col 10 number money
  credit_exposure: number | null         // col 11 number money (colored)
  credit_balance: number | null          // col 12 number money (colored); filter enum
  overdue: number | null                 // col 13 number money (colored)
  sales_value: number | null             // col 14 number money
  total_receivables: number | null       // col 15 number money
  special_liabilities: number | null     // col 16 number money
  open_delivery_credit: number | null    // col 17 number money
  open_bill_doc_credit: number | null    // col 18 number money
  open_orders_credit: number | null      // col 19 number money
  guaranteed_open_delivery: number | null   // col 20 number money
  guarantd_open_billing_docs: number | null // col 21 number money
  guaranteed_open_orders: number | null  // col 22 number money
  validity_period_start: string | null   // col 23 date  ISO-8601 string from BE
  validity_period_end: string | null     // col 24 date  ISO-8601 string from BE (#VALUE! → null)
  risk_category: string | null           // col 25 text
  total_amount: number | null            // col 26 number money
  individual_limit: number | null        // col 27 number money
  sales_organization: string | null      // col 28 text
  distribution_channel: string | null    // col 29 text
  division: string | null                // col 30 text
  sales_group: string | null             // col 31 text
  sales_office: string | null            // col 32 text
  hierarchy_customer: string | null      // col 33 text
  // --- meta fields ---
  report_date: string                    // "dd-mm-yyyy"
  source_file: string | null
  created_at: string                     // ISO-8601 UTC
  updated_at: string                     // ISO-8601 UTC
}

/**
 * Query params for GET /credit-report.
 * All filtering is server-driven — no client-side filtering.
 * Keys must match backend CreditReportListQuery exactly (snake_case).
 * 6 filters: 4 per-field async-select + blocked enum + credit_balance_sign enum.
 * `date` (report_date exact) included for parity; FE does not send it.
 */
export interface CreditReportListQuery extends PageQuery {
  sortBy?: CreditReportSortBy
  /** Optional report-date exact match — "dd-mm-yyyy". FE does not send this. */
  date?: string
  /** Async-select filter — exact match on customer_name. */
  customer_name?: string
  /** Async-select filter — exact match on city. */
  city?: string
  /** Async-select filter — exact match on customer (SAP code). */
  customer?: string
  /** Async-select filter — exact match on cca_description. */
  cca_description?: string
  /** Enum filter — "blocked" maps to blocked="X"; "unblocked" maps to null/"". */
  blocked?: "blocked" | "unblocked"
  /** Enum filter — "positive" = credit_balance >= 0; "negative" = credit_balance < 0. */
  credit_balance_sign?: "positive" | "negative"
}

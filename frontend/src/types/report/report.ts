/**
 * Report JSW/JVML — domain types mirroring the backend `report` domain
 * (`schemas/report.py`). RAKE-pivot layout: rows grouped by SO Sales Org →
 * Distr. Channel → Sold To Party → BRANCH (Sales Office) → Party Code →
 * Ship-To Party → Transport Mode → Destination → ROUTE; dynamic RAKE columns
 * contain the sum of stock_quantity. Credit-report checks are preserved.
 */

export type ReportType = "jsw" | "jvml"
/** Toolbar selection — `both` fans out to two API calls (jsw + jvml), grouped by SO Sales Org. */
export type ReportTypeSelection = ReportType | "both"
// QA-hold aging day-filter ("aged QA-hold" = in_quality_insp > 0 AND round(aging) > 2):
//   include = all stock · exclude = all EXCEPT aged QA-hold · only = ONLY aged QA-hold
export type DaysFilter = "include" | "exclude" | "only"
export type CreditStatus = "" | "No Credit balance" | "NO CREDIT REPORT FOUND"

/** One row of the RAKE pivot report. */
export interface ReportPivotRow {
  so_sales_org: string | null
  distr_chnl: string | null
  sold_to_party: string | null
  sales_office: string | null      // rendered as BRANCH
  party_code: string               // normalized display code
  ship_to_party: string | null
  transport_mode: string | null    // from CustomerCode.transport_mode
  destination: string | null       // from CustomerCode.destination
  route: string | null             // from CustomerCode.route
  rake_quantities: Record<string, number>  // { "KKU": 55.01, "ROAD": 0, ... }
  total: number                    // Σ stock_quantity for this row
  nco_yes_do: number               // Σ stock_quantity where NCO Declared == "Yes"
  nco_yes_do_count: number
  blocked: boolean | null          // null = no credit data
  credit_balance: number | null    // SAP headroom; null = not in credit report
  required_credit: number | null   // (total - nco_yes_do) * coil_price_per_qty
  credit_sufficient: boolean | null
  credit_status: CreditStatus
  credit_note: string              // Balance Available / Not Enough Balance / Balance Negative / …
}

/** Full report payload (the `data` inside the success envelope). */
export interface ReportResponse {
  date: string
  report_type: ReportTypeSelection  // "both" ⇒ merged jsw + jvml, grouped by SO Sales Org
  region_id: string | null
  region_name: string
  days_filter: DaysFilter
  ccas: string[]                    // e.g. ["VJ0H", "1000"] (jsw) / ["JV0H"] (jvml)
  has_stock: boolean                // false → "No stock excel for this date selected"
  has_credit_report: boolean        // false → credit columns "NO CREDIT REPORT FOUND"
  coil_price_per_qty: number | null
  rake_columns: string[]            // sorted unique RAKE values for this report
  rows: ReportPivotRow[]
  grand_total: number
  grand_nco_yes_do: number
  grand_required_credit: number | null
}

/** Query params for GET /report/generate + /report/export (date is "dd-MM-yyyy"). */
export interface ReportQueryParams {
  date: string
  report_type: ReportTypeSelection  // "both" ⇒ one merged call (jsw + jvml)
  region_id?: string
  days: DaysFilter
  columns?: string                  // export only: CSV of visible optional-column keys
}

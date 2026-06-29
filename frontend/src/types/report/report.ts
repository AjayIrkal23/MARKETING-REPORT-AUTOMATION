/**
 * Report JSW/JVML — domain types mirroring the backend `report` domain
 * (`schemas/report.py`). RAKE-pivot layout: rows grouped by SO Sales Org →
 * Distr. Channel → BRANCH (Sales Office) → Sold To Party → Party Code →
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
  customer_name: string | null     // stock-row customer; for the 8-field exclusion identity
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
  rake_totals: Record<string, number>            // RAKE → Σ stock_quantity
  transport_mode_totals: Record<string, number>  // transport_mode → Σ stock_quantity
}

/** One individual stock row contributing to a RAKE total (drill-down). */
export interface RakeDrilldownRow {
  stock_type: ReportType           // "jsw" | "jvml" — which collection it came from
  so_sales_org: string | null      // Sales Org
  distr_chnl: string | null        // Distr Channel
  sold_to_party: string | null     // Sold to party
  sales_office: string | null      // rendered as BRANCH
  party_code: string | null        // normalized display code
  ship_to_party: string | null     // Ship to party
  transport_mode: string | null    // from CustomerCode.transport_mode
  destination: string | null       // from CustomerCode.destination
  customer_name: string | null     // mapped customer
  stock_quantity: number           // this row's quantity
}

/** A merged drill-down row: 8-field identity + summed quantity (Source & Ship To Party dropped). */
export interface RakeDrilldownMergedRow {
  so_sales_org: string | null      // Sales Org
  distr_chnl: string | null        // Distr Channel
  sales_office: string | null      // rendered as BRANCH
  sold_to_party: string | null     // Sold to party
  party_code: string | null        // normalized display code
  transport_mode: string | null    // from CustomerCode.transport_mode
  destination: string | null       // from CustomerCode.destination
  customer_name: string | null     // mapped customer
  stock_quantity: number           // Σ stock_quantity for the merged group
}

/** GET /report/rake-drilldown payload — individual jsw + jvml rows for one RAKE. */
export interface RakeDrilldownResponse {
  rake: string
  date: string
  region_id: string | null
  region_name: string
  days_filter: DaysFilter
  rows: RakeDrilldownRow[]
  merged_rows: RakeDrilldownMergedRow[]   // rows collapsed by 8-field identity (server-computed)
  total_quantity: number
}

/** Query params for GET /report/rake-drilldown. */
export interface RakeDrilldownParams {
  rake: string
  date: string
  region_id?: string
  days: DaysFilter
}

/** Query params for GET /report/generate (date is "dd-MM-yyyy"). */
export interface ReportQueryParams {
  date: string
  report_type: ReportTypeSelection  // "both" ⇒ one merged call (jsw + jvml)
  region_id?: string
  days: DaysFilter
  columns?: string                  // export only: CSV of visible optional-column keys
}

/** Which sheets the combined /report export should include (picker dialog keys). */
export type ExportSheetKey =
  | "pivot"          // BRANCH WISE PIVOT REPORT
  | "rake_totals"    // TOTAL RAKE REPORT
  | "rake_merged"    // one "{RAKE} - Total Rake Wise" sheet per rake (merged rows)
  | "rake_unmerged"  // one "{RAKE} - Batch Rake Wise" sheet per rake (raw rows)
  | "jsw"            // JSW Stock List
  | "jvml"           // JVML Stock List
  | "credit"         // Credit Report

/** One RAKE's browser-only exclusions, sent as the export POST body (per rake). */
export interface RakeExclusionWire {
  keys: string[]      // canonical row_identity strings to omit from breakdown sheets
  subtract: number    // qty to subtract from this rake's TOTAL RAKE REPORT figure
}

/** Query params for GET|POST /report/export-combined (report params + chosen sheets). */
export interface CombinedExportParams extends ReportQueryParams {
  sheets: ExportSheetKey[]
  /** Browser-only RAKE drill-down exclusions; present ⇒ POST with a JSON body. */
  exclusions?: Record<string, RakeExclusionWire>
  /** Same unchecks regrouped by transport mode → subtract from the transport-mode totals sheet. */
  transport_subtract?: Record<string, number>
}

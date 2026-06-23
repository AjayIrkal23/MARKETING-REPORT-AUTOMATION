/**
 * Report JSW/JVML — domain types mirroring the backend `report` domain
 * (`schemas/report.py`). The "Coil Stock" pivot (Sum of Stock Quantity grouped by
 * Distr.Chnl → Party Code) augmented with NCO-Yes+DO, credit Blocked, SAP Credit
 * Balance headroom, and a computed Required Credit.
 */

export type ReportType = "jsw" | "jvml"
// QA-hold aging day-filter ("aged QA-hold" = in_quality_insp > 0 AND round(aging) > 2):
//   include = all stock · exclude = all EXCEPT aged QA-hold · only = ONLY aged QA-hold
export type DaysFilter = "include" | "exclude" | "only"
export type CreditStatus = "" | "No Credit balance" | "NO CREDIT REPORT FOUND"

/** One party row inside a distribution-channel group. */
export interface ReportParty {
  party_code: string                 // normalized display code
  sold_to_party: string | null
  ship_to_party: string | null       // from CustomerCode.ship_to_customer (+ ship_to fallback)
  route: string | null               // from CustomerCode.route
  route_desc: string | null
  rake: string | null                // from CustomerCode.rake
  transport_mode: string | null      // from CustomerCode.transport_mode
  total: number                      // Σ stock_quantity
  nco_yes_do: number                 // Σ stock_quantity where NCO Declared == "Yes"
  nco_yes_do_count: number
  blocked: boolean | null            // null = no credit data
  credit_balance: number | null      // SAP headroom; null = not in credit report
  required_credit: number | null     // (total - nco_yes_do) * coil_price_per_qty
  credit_sufficient: boolean | null
  credit_status: CreditStatus
  credit_note: string                // Balance Available / Not Enough Balance / Balance Negative / …
}

/** A distribution-channel group with subtotals. */
export interface ReportChannel {
  distr_chnl: string                 // "Unspecified" when source value is null
  parties: ReportParty[]
  subtotal: number
  subtotal_nco_yes_do: number
  subtotal_required_credit: number | null
}

/** Full report payload (the `data` inside the success envelope). */
export interface ReportResponse {
  date: string
  report_type: ReportType
  region_id: string | null
  region_name: string
  days_filter: DaysFilter
  ccas: string[]                    // e.g. ["VJ0H", "1000"] (jsw) / ["JV0H"] (jvml)
  has_stock: boolean                 // false → "No stock excel for this date selected"
  has_credit_report: boolean         // false → credit columns "NO CREDIT REPORT FOUND"
  coil_price_per_qty: number | null
  channels: ReportChannel[]
  grand_total: number
  grand_nco_yes_do: number
  grand_required_credit: number | null
}

/** Query params for GET /report/generate (date is "dd-MM-yyyy"). */
export interface ReportQueryParams {
  date: string
  report_type: ReportType
  region_id?: string
  days: DaysFilter
}

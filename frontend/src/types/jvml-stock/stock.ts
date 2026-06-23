/**
 * JVML Stock list — domain types aligned with backend `jvml_stock` domain.
 * SPEC: .planning/jvml-stock/SPEC.md §1 + §3. ADDENDUM: BE-1, FE-5.
 */
import type { PageQuery } from "@/types/api/envelope"

/** Whitelisted sort keys — must match backend JvmlStockSortBy Literal exactly. */
export type JvmlStockSortBy =
  | "created_at"
  | "report_date"
  | "customer"
  | "customer_name"
  | "party_code"
  | "sold_to_party"
  | "ship_to_party"
  | "material"
  | "jsw_grade"
  | "sales_office"
  | "so_sales_org"
  | "sales_order_type"
  | "distr_chnl"
  | "so_product_form"
  | "nco_declared"
  | "batch"
  | "unrestr_qty"
  | "stock_quantity"
  | "aging"

/** 5 filterable field names — must match backend JvmlStockField Literal exactly. */
export type JvmlStockField =
  | "party_code"
  | "sales_order_type"
  | "customer_name"
  | "sales_office"
  | "nco_declared"

/**
 * Single JVML Stock row — mirrors backend JvmlStockPublic schema.
 * text → string|null, number → number|null, date → string|null (ISO).
 * ADDENDUM BE-1: lc_exp_date is string|null (SAP stores as dd.mm.yyyy text, no date coercion).
 */
export interface JvmlStock {
  id: string
  // --- §1 72 columns ---
  so_sales_org: string | null            // col 1  text  filter
  sales_order_type: string | null        // col 2  text  filter
  distr_chnl: string | null             // col 3  text  filter
  sold_to_party: string | null          // col 4  text  filter+q
  party_code: string | null             // col 5  text  q
  ship_to_party: string | null          // col 6  text  q
  customer: string | null               // col 7  text  filter+q
  material: string | null               // col 8  text  filter+q
  sales_office: string | null           // col 9  text  filter+q
  so_product_form: string | null        // col 10 text  filter
  jsw_grade: string | null              // col 11 text  filter+q
  act_thickness_mm: string | null       // col 12 text
  width_mm: string | null               // col 13 text
  batch: string | null                  // col 14 text  q
  unrestr_qty: number | null            // col 15 number
  in_quality_insp: number | null        // col 16 number
  blocked: number | null                // col 17 number
  stock_quantity: number | null         // col 18 number
  usage_decision: string | null         // col 19 text
  nco_declared: string | null           // col 20 text  filter
  next_workcenter: string | null        // col 21 text
  length_mm: string | null              // col 22 text
  nco_reason: string | null             // col 23 text
  ud_remarks: string | null             // col 24 text
  aging: number | null                  // col 25 number
  production_date: string | null        // col 26 date  ISO-8601 string from BE
  shift: string | null                  // col 27 text
  sales_order_no: string | null         // col 28 text  q
  so_item_num: string | null            // col 29 text
  order_status: string | null           // col 30 text
  location: string | null               // col 31 text
  str_no: string | null                 // col 32 text
  sto_no: string | null                 // col 33 text
  do_no: string | null                  // col 34 text
  shipment: string | null               // col 35 text
  storage_location: string | null       // col 36 text
  port_name: string | null              // col 37 text
  unloading_point: string | null        // col 38 text
  recieving_point: string | null        // col 39 text  NOTE: original Excel misspelling
  purchase_order_number: string | null  // col 40 text
  scheduled_status: string | null       // col 41 text
  eq_specification: string | null       // col 42 text
  eq_sub_grade: string | null           // col 43 text
  so_end_application: string | null     // col 44 text
  production_workcenter: string | null  // col 45 text
  ys_in_mpa: number | null              // col 46 number
  elongation: string | null             // col 47 text
  elongation_mic: number | null         // col 48 number
  hardness: string | null               // col 49 text
  s_aluminium_pct: number | null        // col 50 number
  s_boron_pct: number | null            // col 51 number
  s_carbon_pct: number | null           // col 52 number
  s_chromium_pct: number | null         // col 53 number
  s_copper_pct: number | null           // col 54 number
  s_manganese_pct: number | null        // col 55 number
  s_molybdenum_pct: number | null       // col 56 number
  s_nickel_pct: number | null           // col 57 number
  s_niobium_pct: number | null          // col 58 number
  s_phosphorus_pct: number | null       // col 59 number
  s_silicon_pct: number | null          // col 60 number
  s_sulphur_pct: number | null          // col 61 number
  s_titanium_pct: number | null         // col 62 number
  s_vanadium_pct: number | null         // col 63 number
  tensile_strength_mpa_b: number | null // col 64 number
  yield_strength: string | null         // col 65 text
  uts: string | null                    // col 66 text
  special_stock: string | null          // col 67 text
  cp_number: string | null              // col 68 text
  cp_end_date: string | null            // col 69 date  ISO-8601 string from BE
  lc_exp_date: string | null            // col 70 text  (dd.mm.yyyy verbatim — NOT a date)
  route: string | null                  // col 71 text
  route_desc: string | null             // col 72 text
  // --- 7 meta/mapping fields ---
  party_code_normalized: string | null
  customer_name: string | null
  customer_code_id: string | null
  report_date: string                    // "dd-mm-yyyy"
  source_file: string | null
  created_at: string                     // ISO-8601 UTC — date-range filter field
  updated_at: string                     // ISO-8601 UTC
}

/**
 * Query params for GET /jvml-stock.
 * All filtering is server-driven — no client-side filtering.
 * Keys must match backend JvmlStockListQuery exactly (snake_case).
 * 7 filters: single `date` ("dd-MM-yyyy") + 5 per-field filters + region.
 */
export interface JvmlStockListQuery extends PageQuery {
  sortBy?: JvmlStockSortBy
  // single report-date filter — "dd-MM-yyyy", exact match on report_date
  date?: string
  // 5 per-field exact-match filters (JvmlStockField values)
  party_code?: string
  sales_order_type?: string
  customer_name?: string
  sales_office?: string
  nco_declared?: string
  // Region filter — restricts rows to parties linked to this region_id.
  region?: string
}

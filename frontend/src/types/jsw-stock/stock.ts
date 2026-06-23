/**
 * JSW Stock list — domain types aligned with backend `jsw_stock` domain.
 * SPEC: .planning/jsw-stock/SPEC.md §1 + §3. ADDENDUM: BE-1, FE-5.
 */
import type { PageQuery } from "@/types/api/envelope"

/** Whitelisted sort keys — must match backend JswStockSortBy Literal exactly. */
export type JswStockSortBy =
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

/** 5 filterable field names — must match backend JswStockField Literal exactly. */
export type JswStockField =
  | "party_code"
  | "sales_order_type"
  | "customer_name"
  | "sales_office"
  | "nco_declared"

/**
 * Single JSW Stock row — mirrors backend JswStockPublic schema.
 * text → string|null, number → number|null, date → string|null (ISO).
 * ADDENDUM BE-1: lc_exp_date is string|null (SAP stores as dd.mm.yyyy text, no date coercion).
 */
export interface JswStock {
  id: string
  // --- col 1-3: text ---
  so_sales_org: string | null
  sales_order_type: string | null
  distr_chnl: string | null
  // --- col 4-9: text (also q-search fields) ---
  sold_to_party: string | null
  party_code: string | null
  ship_to_party: string | null
  customer: string | null
  material: string | null
  sales_office: string | null
  // --- col 10-11: text ---
  so_product_form: string | null
  jsw_grade: string | null
  // --- col 12-14: text (ADDENDUM BE-2: stored as text) ---
  act_thickness_mm: string | null
  width_mm: string | null
  batch: string | null
  // --- col 15-18: number ---
  unrestr_qty: number | null
  in_quality_insp: number | null
  blocked: number | null
  stock_quantity: number | null
  // --- col 19-24: text ---
  usage_decision: string | null
  nco_declared: string | null
  next_workcenter: string | null
  length_mm: string | null
  nco_reason: string | null
  ud_remarks: string | null
  // --- col 25: number ---
  aging: number | null
  // --- col 26: date → ISO string ---
  production_date: string | null
  // --- col 27-36: text ---
  shift: string | null
  sales_order_no: string | null
  so_item_num: string | null
  order_status: string | null
  location: string | null
  str_no: string | null
  sto_no: string | null
  do_no: string | null
  shipment: string | null
  storage_location: string | null
  // --- col 37-44: text ---
  port_name: string | null
  unloading_point: string | null
  recieving_point: string | null        // sic — matches SAP header "RECIEVING POINT" (ADDENDUM BE-3)
  purchase_order_number: string | null
  scheduled_status: string | null
  eq_specification: string | null
  eq_sub_grade: string | null
  so_end_application: string | null
  // --- col 45: text ---
  production_workcenter: string | null
  // --- col 46: number ---
  ys_in_mpa: number | null
  // --- col 47: text (ADDENDUM BE-2: stored as text) ---
  elongation: string | null
  // --- col 48: number ---
  elongation_mic: number | null
  // --- col 49: text (ADDENDUM BE-2: stored as text) ---
  hardness: string | null
  // --- col 50-63: number (chemistry %) ---
  s_aluminium_pct: number | null
  s_boron_pct: number | null
  s_carbon_pct: number | null
  s_chromium_pct: number | null
  s_copper_pct: number | null
  s_manganese_pct: number | null
  s_molybdenum_pct: number | null
  s_nickel_pct: number | null
  s_niobium_pct: number | null
  s_phosphorus_pct: number | null
  s_silicon_pct: number | null
  s_sulphur_pct: number | null
  s_titanium_pct: number | null
  s_vanadium_pct: number | null
  // --- col 64: number (ADDENDUM BE-6: malformed cells become null) ---
  tensile_strength_mpa_b: number | null
  // --- col 65-69: text (ADDENDUM BE-2) ---
  yield_strength: string | null
  uts: string | null
  special_stock: string | null
  cp_number: string | null
  // --- col 69: date → ISO string ---
  cp_end_date: string | null
  // --- col 70: text — ADDENDUM BE-1: lc_exp_date stays as string, no date coercion ---
  lc_exp_date: string | null
  // --- col 71-72: text ---
  route: string | null
  route_desc: string | null
  // --- mapping / meta fields appended at ingestion ---
  party_code_normalized: string | null
  customer_name: string | null
  customer_code_id: string | null
  report_date: string               // "dd-mm-yyyy" source folder date
  source_file: string | null
  created_at: string                // ISO datetime string
  updated_at: string                // ISO datetime string
}

/**
 * Query params for GET /jsw-stock.
 * All filtering is server-driven — no client-side filtering.
 * Keys must match backend JswStockListQuery exactly (snake_case).
 * Exactly 7 filters: single `date` ("dd-MM-yyyy") + 5 per-field filters + region.
 */
export interface JswStockListQuery extends PageQuery {
  sortBy?: JswStockSortBy
  // single report-date filter — "dd-MM-yyyy", exact match on report_date
  date?: string
  // 5 per-field exact-match filters (JswStockField values)
  party_code?: string
  sales_order_type?: string
  customer_name?: string
  sales_office?: string
  nco_declared?: string
  // Region filter — region _id hex; applied via CustomerCode join on the backend
  region?: string
}

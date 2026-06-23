/**
 * Admin customer-code API contracts — aligned with the backend `customer_code` domain.
 * Contract source: .planning/customer-codes/SPEC.md §4.1.
 * Addendum corrections applied from .planning/customer-codes/ADDENDUM.md §Area 7.
 */

import type { PageQuery } from "@/types/api/envelope"
import type { AsyncOption } from "@/types/admin/options"

/**
 * Whitelisted sort keys for `GET /admin/customer-codes`
 * (must match backend `CustomerCodeSortBy` Literal).
 * Note: `mob`, `ship_to`, `ship_to_customer` are intentionally excluded
 * from sort — backend whitelist omits them.
 */
export type CustomerCodeSortBy =
  | "segment"
  | "code"
  | "customer"
  | "destination"
  | "cam"
  | "head"
  | "route"
  | "ship_to_city"
  | "rake"
  | "transport_mode"
  | "created_at"
  | "updated_at"

/**
 * Filterable field names for `GET /admin/customer-codes/options`.
 * Maps 1:1 to backend `CustomerCodeField` Literal — do NOT expand beyond this set.
 */
export type CustomerCodeField =
  | "segment"
  | "code"
  | "customer"
  | "destination"
  | "cam"
  | "mob"
  | "ship_to_city"
  | "rake"
  | "transport_mode"

/**
 * Client-safe customer-code projection returned by all admin customer-code endpoints.
 * Mirrors backend `CustomerCodePublic` schema.
 * Note: timestamps are snake_case (backend serializes directly).
 * `region_name` is resolved server-side and may be null if the region was deleted.
 */
export interface CustomerCode {
  id: string
  /** SAP segment, e.g. "Retail", "oem", "Stock transfer". Stored as-entered — casing NOT normalized. */
  segment: string
  /** SAP customer code, e.g. "40020365" or "8451". NOT unique — duplicates are valid. */
  code: string
  customer: string
  destination: string
  /** Account manager. Optional — may be null. */
  cam: string | null
  /** Mobile number stored as clean string (coerced from numeric Excel cell). Optional. */
  mob: string | null
  /** Sales head. Optional. */
  head: string | null
  /** Route code, e.g. "KAT036". Optional. */
  route: string | null
  /** Ship-to code stored as clean string. Optional. */
  ship_to: string | null
  /** Ship-to customer name. Optional. */
  ship_to_customer: string | null
  /** Ship-to city. Optional. */
  ship_to_city: string | null
  /** RAKE identifier. Optional. */
  rake: string | null
  /** Transport mode. Optional. */
  transport_mode: string | null
  /** ObjectId hex string referencing the `regions` collection. */
  region_id: string
  /** Resolved region name. Null if region was deleted after import. */
  region_name: string | null
  /** ISO-8601 UTC timestamp. */
  created_at: string
  /** ISO-8601 UTC timestamp. */
  updated_at: string
}

/**
 * Query params for `GET /admin/customer-codes`.
 * All filtering/sorting/pagination is server-driven — never apply client-side.
 *
 * IMPORTANT: query key for region FK filter is `region` (NOT `region_id`).
 * The backend schema maps `query.region` → `filt["region_id"]` internally.
 * Per-field filter keys are snake_case matching backend `CustomerCodeListQuery` exactly.
 */
export interface CustomerCodeListQuery extends PageQuery {
  sortBy?: CustomerCodeSortBy
  /** Case-insensitive free-text search over all fifteen text fields. */
  q?: string
  /** Per-field exact-match filters (each is backend query key, snake_case). */
  segment?: string
  code?: string
  customer?: string
  destination?: string
  cam?: string
  mob?: string
  ship_to_city?: string
  rake?: string
  transport_mode?: string
  /**
   * Region FK exact-match filter.
   * Query key is `region` (NOT `region_id`) — matches backend `CustomerCodeListQuery`.
   */
  region?: string
}

/**
 * Request body for `POST /admin/customer-codes`.
 * Required: segment, code, customer, destination, region_id.
 * Optional fields omitted or null when empty.
 */
export interface CreateCustomerCodeInput {
  segment: string
  code: string
  customer: string
  destination: string
  /** ObjectId hex string of the target region. */
  region_id: string
  cam?: string | null
  mob?: string | null
  head?: string | null
  route?: string | null
  ship_to?: string | null
  ship_to_customer?: string | null
  ship_to_city?: string | null
  rake?: string | null
  transport_mode?: string | null
}

/**
 * Request body for `PATCH /admin/customer-codes/{id}`.
 * All fields are optional — send only the fields being changed.
 * Backend uses `model_dump(exclude_unset=True)` for partial update.
 */
export interface UpdateCustomerCodeInput {
  segment?: string
  code?: string
  customer?: string
  destination?: string
  region_id?: string
  cam?: string | null
  mob?: string | null
  head?: string | null
  route?: string | null
  ship_to?: string | null
  ship_to_customer?: string | null
  ship_to_city?: string | null
  rake?: string | null
  transport_mode?: string | null
}

/** A single row-level error produced by the Excel importer. */
export interface CustomerCodeImportError {
  /** 1-based Excel row number (row 1 = header, data starts at row 2). */
  row: number
  message: string
}

/**
 * Summary returned by `POST /admin/customer-codes/import` (wrapped in `{success, data, ...}`).
 * `skipped` = fully-empty rows silently ignored (not counted in `errors`).
 */
export interface CustomerCodeImportResult {
  total_rows: number
  inserted: number
  updated: number
  skipped: number
  /** ObjectId hex string of the region all imported rows were assigned to. */
  region_id: string
  /** Resolved region name. Null if region lookup failed. */
  region_name: string | null
  errors: CustomerCodeImportError[]
}

/** Type alias — identical to AsyncOption from types/admin/options. Do NOT create a new shape. */
export type CustomerCodeOption = AsyncOption

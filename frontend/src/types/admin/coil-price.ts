/**
 * Admin coil price API contracts — aligned with the backend `coil_price` domain.
 * Backs the admin "Coil Config" page's "Per Coil Price" section.
 */

import type { PageQuery } from "@/types/api/envelope"

/** Whitelisted sort keys for `GET /admin/coil-prices` (must match backend `CoilPriceSortBy` Literal). */
export type CoilPriceSortBy = "quantity" | "price" | "active" | "created_at" | "updated_at"

/**
 * Client-safe coil price projection returned by all admin coil-price endpoints.
 * Mirrors backend `CoilPricePublic` schema. Timestamps are snake_case (backend
 * serializes directly, matching the Region domain).
 */
export interface CoilPrice {
  id: string
  quantity: number
  price: number
  active: boolean
  /** ISO-8601 UTC timestamp. */
  created_at: string
  /** ISO-8601 UTC timestamp. */
  updated_at: string
}

/**
 * Query params for `GET /admin/coil-prices`.
 * All filtering/sorting/pagination is server-driven — never apply client-side.
 */
export interface CoilPriceListQuery extends PageQuery {
  sortBy?: CoilPriceSortBy
  /** "all" = UI sentinel, stripped before API request. */
  active?: boolean | "all"
}

/** Request body for `POST /admin/coil-prices`. */
export interface CreateCoilPriceInput {
  quantity: number
  price: number
  active: boolean
}

/**
 * Request body for `PATCH /admin/coil-prices/{id}`.
 * All fields are optional — send only the fields being changed.
 */
export interface UpdateCoilPriceInput {
  quantity?: number
  price?: number
  active?: boolean
}

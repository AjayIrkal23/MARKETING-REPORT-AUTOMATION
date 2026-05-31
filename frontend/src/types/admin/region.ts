/**
 * Admin region API contracts — aligned with the backend `region` domain.
 * Contract source: .planning/regions/SPEC.md §2.1.
 */

import type { PageQuery } from "@/types/api/envelope"
import type { AsyncOption } from "@/types/admin/options"

/** Whitelisted sort keys for `GET /admin/regions` (must match backend `RegionSortBy` Literal). */
export type RegionSortBy = "name" | "active" | "created_at" | "updated_at"

/**
 * Client-safe region projection returned by all admin region endpoints.
 * Mirrors backend `RegionPublic` schema.
 * Note: timestamps are snake_case (backend serializes directly, unlike AdminUser.createdAt).
 */
export interface Region {
  id: string
  name: string
  emails: string[]
  active: boolean
  /** ISO-8601 UTC timestamp. */
  created_at: string
  /** ISO-8601 UTC timestamp. */
  updated_at: string
}

/**
 * Query params for `GET /admin/regions`.
 * All filtering/sorting/pagination is server-driven — never apply client-side.
 */
export interface RegionListQuery extends PageQuery {
  sortBy?: RegionSortBy
  /** Case-insensitive search over name + emails. */
  q?: string
  /** "all" = UI sentinel, stripped before API request. */
  active?: boolean | "all"
}

/** Request body for `POST /admin/regions`. */
export interface CreateRegionInput {
  name: string
  emails: string[]
  active: boolean
}

/**
 * Request body for `PATCH /admin/regions/{id}`.
 * All fields are optional — send only the fields being changed.
 */
export interface UpdateRegionInput {
  name?: string
  emails?: string[]
  active?: boolean
}

/** Type alias — identical to AsyncOption from types/admin/options. Do NOT create a new shape. */
export type RegionOption = AsyncOption

/**
 * API envelope contracts — mirror the backend's `api-contract-standards`.
 *
 * Backend success shape: `{ success, data, message, meta }`.
 * `meta` carries pagination on list endpoints (see {@link PaginationMeta}).
 */

export type SortOrder = "asc" | "desc"

/** Pagination metadata returned in `meta` on list endpoints. */
export interface PaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
  sortBy: string
  sortOrder: SortOrder
}

/** Successful response envelope. */
export interface ApiSuccess<T> {
  success: true
  data: T
  message: string
  meta?: PaginationMeta | null
}

/** Base query params for backend-driven paginated list endpoints. */
export interface PageQuery {
  page?: number
  limit?: number
  sortOrder?: SortOrder
}

/** Normalized list result: rows + pagination meta. */
export interface PaginatedResult<T> {
  data: T[]
  meta: PaginationMeta
}

/** `GET /admin/customer-codes` — backend-driven paginated customer code list. */

import { buildQuery, getList } from "@/api/client"
import type { PaginatedResult } from "@/types/api/envelope"
import type { CustomerCode, CustomerCodeListQuery } from "@/types/admin/customer-code"

/**
 * Normalise the raw CustomerCodeListQuery into a plain record safe for buildQuery.
 *
 * Rules applied:
 * - Omit every filter/search key that is undefined or an empty string — the
 *   backend rejects unknown query keys and treats empty strings as filters.
 * - `page`, `limit`, `sortBy`, `sortOrder` are always forwarded (backend has
 *   defaults, but being explicit prevents accidental omissions).
 * - `region` maps directly to the "region" query key; the backend schema maps
 *   it to `region_id` internally (do NOT rename to `region_id` here).
 */
function buildParams(
  q: CustomerCodeListQuery,
): Record<string, string | number | undefined> {
  return {
    page: q.page,
    limit: q.limit,
    sortBy: q.sortBy,
    sortOrder: q.sortOrder,
    // Free-text search (matches all 10 text fields via $or on the backend)
    ...(q.q ? { q: q.q } : {}),
    // Per-field exact-match filters — only include when non-empty
    ...(q.segment ? { segment: q.segment } : {}),
    ...(q.code ? { code: q.code } : {}),
    ...(q.customer ? { customer: q.customer } : {}),
    ...(q.destination ? { destination: q.destination } : {}),
    ...(q.cam ? { cam: q.cam } : {}),
    ...(q.mob ? { mob: q.mob } : {}),
    // Region FK filter — query key is "region" (NOT "region_id");
    // the backend schema maps `filt["region_id"] = query.region` internally.
    ...(q.region ? { region: q.region } : {}),
  }
}

/**
 * Fetch a paginated, server-filtered page of customer codes.
 *
 * All filtering, sorting, and pagination is backend-driven — do NOT apply
 * any client-side transforms to the returned rows.
 *
 * @param query - Optional query parameters; defaults to page 1, limit 20,
 *                sorted by `created_at` descending with no active filters.
 * @returns A paginated result containing the matching `CustomerCode` rows
 *          and standard `PaginationMeta` (total, page, limit, totalPages).
 */
export function listCustomerCodes(
  query: CustomerCodeListQuery = {},
): Promise<PaginatedResult<CustomerCode>> {
  return getList<CustomerCode>(
    `/admin/customer-codes${buildQuery(buildParams(query))}`,
  )
}

/**
 * `GET /jsw-stock` — backend-driven paginated JSW Stock list.
 *
 * All filtering, sorting, and pagination is server-driven — do NOT apply any
 * client-side transforms to the returned rows.
 *
 * `buildQuery` strips `undefined` and `""` (and we never forward `null`), so
 * every optional filter is forwarded only when truthy.
 */

import { buildQuery, getList } from "@/api/client"
import type { PaginatedResult } from "@/types/api/envelope"
import type { JswStock, JswStockListQuery } from "@/types/jsw-stock/stock"

/**
 * Normalise `JswStockListQuery` into a plain record safe for `buildQuery`.
 * Keys are snake_case to match the backend `JswStockListQuery` exactly.
 */
function buildParams(
  q: JswStockListQuery,
): Record<string, string | number | undefined> {
  return {
    page: q.page,
    limit: q.limit,
    sortBy: q.sortBy,
    sortOrder: q.sortOrder,
    // single report-date filter ("dd-MM-yyyy", exact match on report_date)
    ...(q.date             ? { date: q.date }                             : {}),
    // 5 per-field exact-match filters — only include when non-empty
    ...(q.party_code       ? { party_code: q.party_code }                 : {}),
    ...(q.sales_order_type ? { sales_order_type: q.sales_order_type }     : {}),
    ...(q.customer_name    ? { customer_name: q.customer_name }           : {}),
    ...(q.sales_office     ? { sales_office: q.sales_office }             : {}),
    ...(q.nco_declared     ? { nco_declared: q.nco_declared }             : {}),
  }
}

/**
 * Fetch a paginated, server-filtered page of JSW Stock rows.
 *
 * @param query - Optional query parameters; defaults to page 1, limit 20,
 *                sorted by `created_at` descending with no active filters.
 * @returns A paginated result containing the matching `JswStock` rows
 *          and standard `PaginationMeta` (total, page, limit, totalPages).
 */
export function listJswStock(
  query: JswStockListQuery = {},
): Promise<PaginatedResult<JswStock>> {
  return getList<JswStock>(`/jsw-stock${buildQuery(buildParams(query))}`)
}

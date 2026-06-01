/**
 * `GET /credit-report` — backend-driven paginated Credit Report list.
 *
 * All filtering, sorting, and pagination is server-driven — do NOT apply any
 * client-side transforms to the returned rows.
 *
 * `buildQuery` strips `undefined` and `""` (and we never forward `null`), so
 * every optional filter is forwarded only when truthy.
 */

import { buildQuery, getList } from "@/api/client"
import type { PaginatedResult } from "@/types/api/envelope"
import type { CreditReport, CreditReportListQuery } from "@/types/credit-report/credit-report"

/**
 * Normalise `CreditReportListQuery` into a plain record safe for `buildQuery`.
 * Keys are snake_case to match the backend `CreditReportListQuery` exactly.
 */
function buildParams(
  q: CreditReportListQuery,
): Record<string, string | number | undefined> {
  return {
    page: q.page,
    limit: q.limit,
    sortBy: q.sortBy,
    sortOrder: q.sortOrder,
    // single report-date filter ("dd-MM-yyyy", exact match on report_date)
    ...(q.date                ? { date: q.date }                               : {}),
    // 4 per-field exact-match async-select filters — only include when non-empty
    ...(q.customer_name       ? { customer_name: q.customer_name }             : {}),
    ...(q.city                ? { city: q.city }                               : {}),
    ...(q.customer            ? { customer: q.customer }                       : {}),
    ...(q.cca_description     ? { cca_description: q.cca_description }         : {}),
    // 2 enum filters — only include when non-empty
    ...(q.blocked             ? { blocked: q.blocked }                         : {}),
    ...(q.credit_balance_sign ? { credit_balance_sign: q.credit_balance_sign } : {}),
  }
}

/**
 * Fetch a paginated, server-filtered page of Credit Report rows.
 *
 * @param query - Optional query parameters; defaults to page 1, limit 20,
 *                sorted by `created_at` descending with no active filters.
 * @returns A paginated result containing the matching `CreditReport` rows
 *          and standard `PaginationMeta` (total, page, limit, totalPages).
 */
export function listCreditReport(
  query: CreditReportListQuery = {},
): Promise<PaginatedResult<CreditReport>> {
  return getList<CreditReport>(`/credit-report${buildQuery(buildParams(query))}`)
}

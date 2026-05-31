/**
 * `GET /admin/customer-codes/options` — backend-driven async option search per field (≤20 results).
 *
 * Unlike the Region options module (single global search), this module exposes a
 * **curried factory** because the customer-code domain has six filterable fields and
 * each `AsyncCombobox` must receive a stable, field-specific fetcher function.
 *
 * Usage:
 * ```ts
 * // At module level or frozen with useMemo([]) — never inline in JSX:
 * const fetchSegments  = searchCustomerCodeFieldOptions("segment")
 * const fetchCustomers = searchCustomerCodeFieldOptions("customer")
 *
 * // Each returned function matches the AsyncCombobox fetcher signature:
 * fetchSegments("Retail")  // → Promise<AsyncOption[]>
 * ```
 *
 * Referential stability matters: if the fetcher reference changes on every render,
 * `useAsyncOptions` re-fires the search on every keystroke cycle. Callers MUST freeze
 * the outer call — see `CustomerCodeFilters.tsx` `FETCHERS` constant.
 */

import { buildQuery, getData } from "@/api/client"
import type { AsyncOption } from "@/types/admin/options"
import type { CustomerCodeField } from "@/types/admin/customer-code"

/**
 * Curried factory — returns a field-specific async option fetcher.
 *
 * @param field - One of the six filterable `CustomerCodeField` values
 *                (`segment`, `code`, `customer`, `destination`, `cam`, `mob`).
 *                Sent verbatim as the `field` query parameter.
 * @returns A stable fetcher `(q: string) => Promise<AsyncOption[]>` suitable for
 *          passing directly to `AsyncCombobox`. The backend performs case-insensitive
 *          regex search when `q` is non-empty and returns ≤ 20 distinct values.
 *
 * @example
 * ```ts
 * // Freeze at module scope or with useMemo([]) — never call inside render:
 * const FETCHERS = Object.fromEntries(
 *   FIELD_FILTERS.map(({ field }) => [field, searchCustomerCodeFieldOptions(field)])
 * ) as Record<CustomerCodeField, (q: string) => Promise<AsyncOption[]>>
 * ```
 */
export function searchCustomerCodeFieldOptions(
  field: CustomerCodeField,
): (q: string) => Promise<AsyncOption[]> {
  return (q: string) =>
    getData<AsyncOption[]>(
      `/admin/customer-codes/options${buildQuery({ field, q, limit: 20 })}`,
    )
}

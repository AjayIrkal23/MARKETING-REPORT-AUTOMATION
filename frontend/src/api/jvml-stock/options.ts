/**
 * `GET /jvml-stock/options` — backend-driven async option search per field (≤ 20 results).
 *
 * The jvml-stock domain has 5 filterable fields and each `AsyncCombobox` must
 * receive a stable, field-specific fetcher function — hence this curried factory.
 *
 * Referential stability matters: if the fetcher reference changes on every
 * render, `useAsyncOptions` re-fires the search on every keystroke cycle.
 * Callers MUST freeze the outer call — see `JvmlStockFilters.tsx` `FETCHERS`.
 */

import { buildQuery, getData } from "@/api/client"
import type { AsyncOption } from "@/types/admin/options"
import type { JvmlStockField } from "@/types/jvml-stock/stock"

/**
 * Curried factory — returns a field-specific async option fetcher.
 *
 * @param field - One of the 5 filterable `JvmlStockField` values
 *                (`party_code`, `sales_order_type`, `customer_name`,
 *                 `sales_office`, `nco_declared`). Sent verbatim as the `field` query parameter.
 * @returns A stable fetcher `(q: string) => Promise<AsyncOption[]>` suitable for
 *          passing directly to `AsyncCombobox`. The backend performs case-insensitive
 *          regex search when `q` is non-empty and returns ≤ 20 distinct values.
 */
export function searchJvmlStockFieldOptions(
  field: JvmlStockField,
): (q: string) => Promise<AsyncOption[]> {
  return (q: string) =>
    getData<AsyncOption[]>(
      `/jvml-stock/options${buildQuery({ field, q, limit: 20 })}`,
    )
}

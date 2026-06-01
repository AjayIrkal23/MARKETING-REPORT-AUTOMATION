/**
 * `GET /credit-report/options` — backend-driven async option search per field (≤ 20 results).
 *
 * The credit-report domain has 4 filterable fields and each `AsyncCombobox` must
 * receive a stable, field-specific fetcher function — hence this curried factory.
 *
 * Referential stability matters: if the fetcher reference changes on every
 * render, `useAsyncOptions` re-fires the search on every keystroke cycle.
 * Callers MUST freeze the outer call — see `CreditReportFilters.tsx` `FETCHERS`.
 */

import { buildQuery, getData } from "@/api/client"
import type { AsyncOption } from "@/types/admin/options"
import type { CreditReportField } from "@/types/credit-report/credit-report"

/**
 * Curried factory — returns a field-specific async option fetcher.
 *
 * @param field - One of the 4 filterable `CreditReportField` values
 *                (`customer_name`, `city`, `customer`, `cca_description`).
 *                Sent verbatim as the `field` query parameter.
 * @returns A stable fetcher `(q: string) => Promise<AsyncOption[]>` suitable for
 *          passing directly to `AsyncCombobox`. The backend performs case-insensitive
 *          regex search when `q` is non-empty and returns ≤ 20 distinct values.
 */
export function searchCreditReportFieldOptions(
  field: CreditReportField,
): (q: string) => Promise<AsyncOption[]> {
  return (q: string) =>
    getData<AsyncOption[]>(
      `/credit-report/options${buildQuery({ field, q, limit: 20 })}`,
    )
}

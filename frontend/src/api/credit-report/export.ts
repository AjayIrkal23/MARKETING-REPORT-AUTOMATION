/**
 * `GET /credit-report/export` — download matching rows as .xlsx.
 *
 * Uses raw `fetch` because the endpoint returns a binary stream.
 */

import { BASE_URL } from "@/api/client"
import { downloadFromFetch } from "@/lib/download"
import type { CreditReportListQuery } from "@/types/credit-report/credit-report"

export async function exportCreditReport(
  query: CreditReportListQuery,
  filename?: string,
): Promise<void> {
  const params = new URLSearchParams()

  if (query.date) params.set("date", query.date)
  if (query.customer_name) params.set("customer_name", query.customer_name)
  if (query.city) params.set("city", query.city)
  if (query.customer) params.set("customer", query.customer)
  if (query.cca_description) params.set("cca_description", query.cca_description)
  if (query.blocked) params.set("blocked", query.blocked)
  if (query.credit_balance_sign) params.set("credit_balance_sign", query.credit_balance_sign)
  if (query.plant && query.plant !== "all") params.set("plant", query.plant)
  if (query.region) params.set("region", query.region)

  const queryString = params.toString()
  const url = `/credit-report/export${queryString ? `?${queryString}` : ""}`
  const defaultFilename = `credit_report_${query.date || "all"}.xlsx`

  await downloadFromFetch(`${BASE_URL}${url}`, filename || defaultFilename)
}

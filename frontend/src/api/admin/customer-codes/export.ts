/**
 * `GET /admin/customer-codes/export` — download matching rows as .xlsx.
 *
 * Uses the shared `downloadFromFetch` helper because the endpoint returns a
 * binary `.xlsx` stream rather than the standard JSON envelope.
 */

import { downloadFromFetch } from "@/lib/download"
import type { CustomerCodeListQuery } from "@/types/admin/customer-code"

const BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? "/api"

const FILENAME = "customer_codes_export.xlsx"

/**
 * Export customer codes matching the provided query as an .xlsx download.
 *
 * @param query - Current list query (filters, search, region). Pagination and
 *                sort keys are ignored by the export endpoint.
 * @throws {import("@/api/client").ApiError} When the server responds with a non-2xx status.
 */
export async function exportCustomerCodes(query: CustomerCodeListQuery): Promise<void> {
  const params = new URLSearchParams()

  if (query.q) params.set("q", query.q)
  if (query.segment) params.set("segment", query.segment)
  if (query.code) params.set("code", query.code)
  if (query.customer) params.set("customer", query.customer)
  if (query.destination) params.set("destination", query.destination)
  if (query.cam) params.set("cam", query.cam)
  if (query.mob) params.set("mob", query.mob)
  if (query.ship_to_city) params.set("ship_to_city", query.ship_to_city)
  if (query.rake) params.set("rake", query.rake)
  if (query.transport_mode) params.set("transport_mode", query.transport_mode)
  if (query.region) params.set("region", query.region)

  const queryString = params.toString()
  const url = `${BASE_URL}/admin/customer-codes/export${queryString ? `?${queryString}` : ""}`

  await downloadFromFetch(url, FILENAME)
}

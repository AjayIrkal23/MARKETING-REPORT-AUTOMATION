/**
 * `GET /admin/customer-codes/export` — download matching rows as .xlsx.
 *
 * This function intentionally uses raw `fetch` instead of `apiClient` because
 * the endpoint returns a binary `.xlsx` stream, not a JSON envelope.
 *
 * It reuses the same filter params as `listCustomerCodes` but ignores
 * pagination/sort so the export contains every matching row.
 */

import { ApiError } from "@/api/client"
import type { ApiErrorBody } from "@/types/api/error"
import type { CustomerCodeListQuery } from "@/types/admin/customer-code"

const BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? "/api"

const FILENAME = "customer_codes_export.xlsx"

/**
 * Export customer codes matching the provided query as an .xlsx download.
 *
 * @param query - Current list query (filters, search, region). Pagination and
 *                sort keys are ignored by the export endpoint.
 * @throws {ApiError} When the server responds with a non-2xx status.
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

  const res = await fetch(url, {
    method: "GET",
    credentials: "include",
  })

  if (!res.ok) {
    const json: unknown = await res.json().catch(() => null)
    const envelope = json as { error?: ApiErrorBody } | null
    const body: ApiErrorBody = envelope?.error ?? {
      code: "UNKNOWN",
      message: res.statusText || "Export failed",
    }
    throw new ApiError(body, res.status)
  }

  const blob = await res.blob()
  const objectUrl = URL.createObjectURL(blob)

  const anchor = document.createElement("a")
  anchor.href = objectUrl
  anchor.download = FILENAME

  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)

  URL.revokeObjectURL(objectUrl)
}

/**
 * `GET /admin/customer-codes/template` — download the Excel import template.
 *
 * Uses the shared `downloadFromFetch` helper because the endpoint returns a
 * binary `.xlsx` stream rather than the standard JSON envelope.
 */

import { downloadFromFetch } from "@/lib/download"

const BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? "/api"

const TEMPLATE_FILENAME = "customer_codes_template.xlsx"

/**
 * Download the customer-codes Excel import template from the backend.
 *
 * @throws {import("@/api/client").ApiError} When the server responds with a non-2xx status.
 */
export async function downloadCustomerCodesTemplate(): Promise<void> {
  await downloadFromFetch(`${BASE_URL}/admin/customer-codes/template`, TEMPLATE_FILENAME)
}

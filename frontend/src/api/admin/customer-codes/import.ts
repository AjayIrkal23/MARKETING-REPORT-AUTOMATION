/**
 * Customer code Excel import — raw `fetch` transport (NOT `apiClient`).
 *
 * ## Why `apiClient` is bypassed
 *
 * `apiClient` (via `src/api/client.ts → request()`) unconditionally sets
 * `Content-Type: application/json`.  When the browser sends a `FormData`
 * body it MUST set the `Content-Type` to `multipart/form-data; boundary=<…>`
 * itself — including the generated boundary token.  Manually setting
 * `Content-Type: application/json` strips the boundary, which causes FastAPI
 * to reject the request with HTTP 422 ("unprocessable entity") before
 * `python-multipart` can parse the parts.
 *
 * The fix is to omit `Content-Type` entirely and let the browser negotiate
 * the correct multipart header automatically.  Because `request()` always
 * adds the header, we bypass it and call `fetch` directly.
 *
 * Endpoint:  `POST /admin/customer-codes/import`
 * Body:      `multipart/form-data` — field `file` (.xlsx) + field `region_id`
 * Response:  standard JSON envelope `{ success, data: CustomerCodeImportResult, message }`
 */

import { ApiError } from "@/api/client"
import type { ApiErrorBody } from "@/types/api/error"
import type { ApiSuccess } from "@/types/api/envelope"
import type { CustomerCodeImportResult } from "@/types/admin/customer-code"

/**
 * `BASE_URL` is NOT exported from `src/api/client.ts` — the env-var logic
 * must be duplicated here so the raw `fetch` call targets the same base.
 *
 * @see src/api/client.ts — same pattern used internally by `request()`.
 */
const BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? "/api"

/**
 * Upload an Excel file (.xlsx) and import its rows as customer codes into
 * the given region.
 *
 * Sends a `multipart/form-data` POST to `POST /admin/customer-codes/import`
 * using a raw `fetch` call so the browser can auto-set the correct
 * `Content-Type: multipart/form-data; boundary=…` header.
 *
 * The backend validates the file extension, enforces a 10 MB size cap, and
 * maps every header-normalised row against the customer-code domain fields.
 * Fully-empty rows are silently skipped; rows with missing required fields
 * are recorded in `errors`.
 *
 * @param file      The `.xlsx` file chosen by the user.
 * @param regionId  ObjectId hex string of the target Region document.
 * @returns         Import summary — counts and per-row error list.
 * @throws          {@link ApiError} on HTTP error or `success !== true`.
 *
 * @example
 * ```ts
 * const result = await importCustomerCodes(file, selectedRegionId)
 * console.log(`Inserted ${result.inserted} / ${result.total_rows} rows`)
 * if (result.errors.length) console.warn(result.errors)
 * ```
 */
export async function importCustomerCodes(
  file: File,
  regionId: string,
): Promise<CustomerCodeImportResult> {
  // Build the multipart body — browser sets Content-Type + boundary automatically.
  const form = new FormData()
  form.append("file", file)
  form.append("region_id", regionId)

  const res = await fetch(`${BASE_URL}/admin/customer-codes/import`, {
    method: "POST",
    // Send the session cookie so the admin-auth dependency resolves.
    credentials: "include",
    // No Content-Type header — must be absent so the browser can inject the
    // multipart boundary.  apiClient always adds "Content-Type: application/json",
    // which is why this function uses raw fetch instead.
    body: form,
  })

  // Guard: `res.json()` throws when the server returns a non-JSON body
  // (e.g. HTTP 413 "Request Entity Too Large" from a reverse-proxy before
  // the application layer).  Swallow the parse error and fall back to a
  // synthesised ApiErrorBody so we always throw a typed ApiError.
  const json: unknown = await res.json().catch(() => null)
  const envelope = json as Partial<ApiSuccess<CustomerCodeImportResult>> & {
    error?: ApiErrorBody
  }

  if (!res.ok || envelope?.success !== true) {
    const body: ApiErrorBody = envelope?.error ?? {
      code: "UNKNOWN",
      message: res.statusText || "Import failed",
    }
    throw new ApiError(body, res.status)
  }

  return (envelope as ApiSuccess<CustomerCodeImportResult>).data
}

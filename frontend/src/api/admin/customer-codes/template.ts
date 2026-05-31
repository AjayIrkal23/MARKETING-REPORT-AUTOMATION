/**
 * `GET /admin/customer-codes/template` — download the Excel import template.
 *
 * This function intentionally uses raw `fetch` instead of `apiClient`.
 * The endpoint returns a binary `.xlsx` stream, not a JSON envelope.
 * `apiClient` forces `Content-Type: application/json` and attempts
 * `res.json()` on every response — both assumptions break binary downloads.
 *
 * Pattern: fetch → guard HTTP errors (parsing any error envelope the server
 * may still return) → `res.blob()` → object URL → anchor click → revoke.
 *
 * BASE_URL is not exported from `client.ts` — it is duplicated here per the
 * ADDENDUM (Area 7 BLOCKER) to keep this module self-contained.
 */

import { ApiError } from "@/api/client"
import type { ApiErrorBody } from "@/types/api/error"

// Mirrors the same env-var logic in client.ts — not re-exported from there,
// so we duplicate it here rather than introducing a cross-module coupling.
const BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? "/api"

/** Filename written to the anchor's `download` attribute. */
const TEMPLATE_FILENAME = "customer_codes_template.xlsx"

/**
 * Download the customer-codes Excel import template from the backend.
 *
 * Triggers a browser file-save dialog by creating a temporary object URL
 * and programmatically clicking an `<a download>` element.  The object URL
 * is revoked immediately after the click to avoid memory leaks.
 *
 * On HTTP error the function parses any JSON error envelope the server
 * may have included and throws an {@link ApiError} — the same error class
 * used by all other API helpers — so callers can handle errors uniformly.
 *
 * @throws {ApiError} When the server responds with a non-2xx status.
 * @returns A resolved `Promise<void>` once the download has been triggered
 *          (the browser handles the actual file-save asynchronously).
 *
 * @example
 * ```ts
 * await downloadCustomerCodesTemplate()
 * ```
 */
export async function downloadCustomerCodesTemplate(): Promise<void> {
  // Raw GET — credentials required for the admin-gated endpoint.
  // Do NOT set Content-Type; the browser will omit it for a plain GET.
  const res = await fetch(`${BASE_URL}/admin/customer-codes/template`, {
    method: "GET",
    credentials: "include",
  })

  if (!res.ok) {
    // The endpoint normally streams binary, but on errors (401, 403, 500)
    // the backend may still return a JSON error envelope.  Guard the parse
    // with .catch(() => null) so a non-JSON body doesn't throw a second error.
    const json: unknown = await res.json().catch(() => null)
    const envelope = json as { error?: ApiErrorBody } | null
    const body: ApiErrorBody = envelope?.error ?? {
      code: "UNKNOWN",
      message: res.statusText || "Template download failed",
    }
    throw new ApiError(body, res.status)
  }

  // Materialise the binary stream into a Blob, then hand it to the browser
  // via a temporary object URL bound to an invisible anchor element.
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)

  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = TEMPLATE_FILENAME

  // Appending to body is required in Firefox for the click to trigger a download.
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)

  // Revoke synchronously — the browser has already queued the download.
  URL.revokeObjectURL(url)
}

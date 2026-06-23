/**
 * Shared browser download helpers for binary backend responses.
 *
 * API download endpoints return raw bytes (`.xlsx`, `.csv`, etc.), not the
 * standard JSON envelope, so they bypass `apiClient` and use raw `fetch` with
 * session credentials. HTTP errors are still normalized to {@link ApiError}.
 */

import { ApiError } from "@/api/client"
import type { ApiErrorBody } from "@/types/api/error"

/** Trigger a browser save dialog for `blob` using `filename`. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename

  // Required in Firefox for programmatic clicks to trigger a download.
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)

  URL.revokeObjectURL(url)
}

/**
 * Fetch a binary resource and download it. Credentials are included by default.
 *
 * @throws {ApiError} When the server responds with a non-2xx status.
 */
export async function downloadFromFetch(
  url: string,
  filename: string,
  init?: RequestInit,
): Promise<void> {
  const res = await fetch(url, {
    credentials: "include",
    ...init,
  })

  if (!res.ok) {
    const json: unknown = await res.json().catch(() => null)
    const envelope = json as { error?: ApiErrorBody } | null
    const body: ApiErrorBody = envelope?.error ?? {
      code: "UNKNOWN",
      message: res.statusText || "Download failed",
    }
    throw new ApiError(body, res.status)
  }

  const blob = await res.blob()
  downloadBlob(blob, filename)
}

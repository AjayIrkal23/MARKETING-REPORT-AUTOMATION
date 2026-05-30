/**
 * API error contracts — mirror the backend error envelope:
 * `{ success: false, error: { code, message, details } }`.
 *
 * The runtime `ApiError` class that implements {@link NormalizedApiError}
 * lives in `src/api/client.ts`.
 */

/** Error body inside the backend error envelope. */
export interface ApiErrorBody {
  code: string
  message: string
  details?: unknown
}

/**
 * Normalized client-side error shape — the stable public surface every failed
 * request is mapped to (network errors included). Implemented by `ApiError`.
 */
export interface NormalizedApiError {
  code: string
  message: string
  /** HTTP status, or 0 for a network/transport failure. */
  statusCode: number
  /** True for transient statuses (network, 408/425/429/5xx) — safe to retry. */
  isRetryable: boolean
  details?: unknown
}

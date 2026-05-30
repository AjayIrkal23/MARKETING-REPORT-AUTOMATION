/**
 * API error contracts — mirror the backend error envelope:
 * `{ success: false, error: { code, message, details } }`.
 *
 * The runtime `ApiError` class that wraps these lives in `src/api/client.ts`.
 */

/** Error body inside the backend error envelope. */
export interface ApiErrorBody {
  code: string
  message: string
  details?: unknown
}

/** Full error envelope returned by the backend on failure. */
export interface ApiErrorEnvelope {
  success: false
  error: ApiErrorBody
}

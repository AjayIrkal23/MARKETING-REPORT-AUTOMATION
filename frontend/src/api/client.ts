/**
 * Base HTTP client. The single transport for all backend calls — domain
 * modules under `src/api/<domain>/*` build on these helpers and never call
 * `fetch` themselves.
 *
 * In dev, `/api/*` is proxied to the FastAPI backend (see `vite.config.ts`).
 * Override the base URL with `VITE_API_URL` for other environments.
 *
 * Every backend JSON response uses the standard envelope
 * (`{ success, data, message, meta }` / `{ success: false, error }`); these
 * helpers unwrap `data` and throw {@link ApiError} on failure.
 */

import type { ApiSuccess, PaginatedResult, PaginationMeta } from "@/types/api/envelope"
import type { ApiErrorBody } from "@/types/api/error"

const BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? "/api"

/** Runtime error carrying the backend's `{ code, message, details }` body. */
export class ApiError extends Error {
  readonly code: string
  readonly status: number
  readonly details?: unknown

  constructor(body: ApiErrorBody, status: number) {
    super(body.message)
    this.name = "ApiError"
    this.code = body.code
    this.status = status
    this.details = body.details
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<ApiSuccess<T>> {
  const res = await fetch(`${BASE_URL}${path}`, {
    // Send/receive the httpOnly session cookie on every request.
    credentials: "include",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    ...init,
  })
  const json: unknown = await res.json().catch(() => null)
  const envelope = json as Partial<ApiSuccess<T>> & { error?: ApiErrorBody }

  if (!res.ok || envelope?.success !== true) {
    const body: ApiErrorBody = envelope?.error ?? {
      code: "UNKNOWN",
      message: res.statusText || "Request failed",
    }
    throw new ApiError(body, res.status)
  }
  return envelope as ApiSuccess<T>
}

/** GET a single resource and unwrap `data`. */
export async function getData<T>(path: string): Promise<T> {
  return (await request<T>(path, { method: "GET" })).data
}

/** POST a JSON body and unwrap `data`. */
export async function postData<T>(path: string, body: unknown): Promise<T> {
  return (await request<T>(path, { method: "POST", body: JSON.stringify(body) })).data
}

/** PATCH a JSON body and unwrap `data`. */
export async function patchData<T>(path: string, body: unknown): Promise<T> {
  return (await request<T>(path, { method: "PATCH", body: JSON.stringify(body) })).data
}

/** DELETE a resource and unwrap `data` (may be `null` for 204-style responses). */
export async function deleteData<T>(path: string): Promise<T> {
  return (await request<T>(path, { method: "DELETE" })).data
}

/** GET a backend-driven paginated list — returns rows + pagination meta. */
export async function getList<T>(path: string): Promise<PaginatedResult<T>> {
  const env = await request<T[]>(path, { method: "GET" })
  return { data: env.data, meta: env.meta as PaginationMeta }
}

/** Build a `?a=1&b=2` query string, skipping empty/undefined values. */
export function buildQuery(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") search.set(key, String(value))
  }
  const qs = search.toString()
  return qs ? `?${qs}` : ""
}

/**
 * Minimal API client.
 *
 * In dev, requests to `/api/*` are proxied to the backend (see vite.config.ts).
 * Override the base URL with VITE_API_URL for other environments.
 */
const BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? "/api"

export async function getJSON<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { Accept: "application/json" },
    ...init,
  })
  if (!res.ok) {
    throw new Error(`API ${path} failed: ${res.status} ${res.statusText}`)
  }
  return (await res.json()) as T
}

/**
 * Meta domain contracts — aligned with the backend `meta` domain
 * (`GET /`, `GET /health`, `GET /ping`).
 */

/** `GET /` service banner. */
export interface RootData {
  service: string
  version: string
  docs: string
  ping: string
}

/** `GET /health` payload. */
export interface HealthData {
  status: string
  version: string
  uptime_seconds: number
}

/** `GET /ping` payload. */
export interface PingData {
  message: string
  seq: number
  timestamp: string
}

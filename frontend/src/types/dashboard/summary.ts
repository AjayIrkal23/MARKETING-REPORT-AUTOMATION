/**
 * Dashboard summary — domain types mirroring the backend `dashboard` domain
 * (`schemas/dashboard.py`). One entry per scheduled-ingestion report, reflecting
 * today's ingestion state. `extracted` / `missing` are computed server-side.
 */

/** The three scheduled-ingestion report domains (mirrors backend Literal). */
export type DashboardReportKey = "jsw_stock" | "jvml_stock" | "credit_report"

/** Raw ingestion status — `none` when no record exists for today yet. */
export type DashboardReportRawStatus =
  | "none"
  | "pending"
  | "ingested"
  | "partial"
  | "missing"
  | "alerted"
  | "error"

export interface DashboardZoneStatus {
  region_id: string
  name: string
  status: string
  row_count: number
  found_at: string | null
}

/** Today's ingestion state for one report domain (one dashboard card). */
export interface DashboardReportStatus {
  key: DashboardReportKey
  label: string
  report_date: string                  // today's "dd-mm-yyyy" (local)
  status: DashboardReportRawStatus
  extracted: boolean                   // status === "ingested"
  missing: boolean                     // status ∈ {missing, alerted}
  row_count: number
  found_at: string | null              // ISO datetime when ingested, else null
  enabled: boolean
  zones: DashboardZoneStatus[]
}

/** Per-report ingestion status for today — drives the dashboard cards. */
export interface DashboardSummary {
  date: string                         // today's "dd-mm-yyyy" (local)
  reports: DashboardReportStatus[]
}

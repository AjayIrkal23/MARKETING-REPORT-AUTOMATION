/**
 * Settings — Credit Report Excel config domain types.
 *
 * Mirrors backend schemas:
 *   - CreditReportConfigPublic  → CreditReportConfig
 *   - CreditReportConfigUpdate  → CreditReportConfigInput
 *   - CreditReportStatusPublic  → CreditReportStatus
 *   - CreditReportIngestionRow  → CreditReportIngestionRow
 *
 * SPEC: .planning/credit-report/SPEC.md §3 types/settings/credit-report-config.ts
 * ADDENDUM: A-FE clarifications (FE-9: card owns hook; no id on config).
 */

// ---------------------------------------------------------------------------
// Config — singleton document returned by GET /admin/credit-report/config
// ---------------------------------------------------------------------------

/**
 * The Credit Report Excel ingestion configuration singleton.
 * Backend: CreditReportConfigPublic — no `id` field (BE-17: intentional omission).
 */
export interface CreditReportConfig {
  /** Whether the scheduled poll job is active. */
  enabled: boolean
  /**
   * Absolute directory path to search for dated sub-folders.
   * The scheduler polls `<base_path>/<dd-mm-yyyy>/<file_name>.xlsx`.
   */
  base_path: string
  /** Excel file name without the `.xlsx` extension (e.g. `"credit report"`). */
  file_name: string
  /**
   * Daily window start — 24h `"HH:MM"` string (e.g. `"08:00"`).
   * The poller only runs within [start_time, end_time).
   */
  start_time: string
  /**
   * Daily window end — 24h `"HH:MM"` string (e.g. `"20:00"`).
   * If the file has not appeared by this time the missing-alert email is sent.
   */
  end_time: string
  /**
   * How often (in full hours, 1–24) the poll job fires while inside the window.
   * Default: 1.
   */
  interval_hours: number
  /**
   * Addresses that receive the "CREDIT REPORT EXCEL not found" alert email.
   * Stored lowercase and deduplicated by the backend.
   */
  notify_emails: string[]
  /**
   * ISO-8601 datetime of the last PUT /admin/credit-report/config save,
   * or null if the config was never saved (i.e. still at server defaults).
   */
  updated_at: string | null
}

// ---------------------------------------------------------------------------
// Config input — PUT /admin/credit-report/config request body
// ---------------------------------------------------------------------------

/**
 * Form submission shape for saving the Credit Report config.
 * Identical to CreditReportConfig minus `updated_at` (set by the server).
 */
export interface CreditReportConfigInput {
  enabled: boolean
  base_path: string
  file_name: string
  start_time: string
  end_time: string
  interval_hours: number
  notify_emails: string[]
}

// ---------------------------------------------------------------------------
// Ingestion row — single entry in the recent-runs list
// ---------------------------------------------------------------------------

/**
 * One entry in the CreditReportStatus.recent array.
 * Mirrors the backend CreditReportIngestionRow schema.
 */
export interface CreditReportIngestionRow {
  /** Source folder date in `dd-mm-yyyy` format (e.g. `"31-05-2026"`). */
  report_date: string
  /**
   * Current ingestion status for this date.
   * One of: `"pending"` | `"ingested"` | `"missing"` | `"alerted"` | `"error"`.
   */
  status: string
  /** Number of rows successfully stored; 0 when not yet ingested. */
  row_count: number
  /**
   * ISO-8601 datetime when the file was found and ingestion started,
   * or null if the file has not been found yet.
   */
  found_at: string | null
  /** ISO-8601 datetime this ingestion record was created in MongoDB. */
  created_at: string
}

export interface CreditReportZoneStatus {
  region_id: string
  name: string
  status: string
  row_count: number
  found_at: string | null
  file_path: string | null
  error: string | null
}

// ---------------------------------------------------------------------------
// Status — GET /admin/credit-report/status response
// ---------------------------------------------------------------------------

/**
 * Live ingestion status for the Credit Report poll job.
 * Mirrors the backend CreditReportStatusPublic schema.
 */
export interface CreditReportStatus {
  /** Whether the scheduled job is currently enabled (from config). */
  enabled: boolean
  /**
   * Report date of the most recent ingestion attempt in `dd-mm-yyyy` format,
   * or null if no ingestion has ever run.
   */
  last_report_date: string | null
  /**
   * Status of the most recent ingestion attempt
   * (`"pending"` | `"ingested"` | `"missing"` | `"alerted"` | `"error"`),
   * or null if no ingestion has ever run.
   */
  last_status: string | null
  /**
   * Row count from the most recent successful ingestion,
   * or null if no successful ingestion has occurred.
   */
  last_row_count: number | null
  /**
   * ISO-8601 datetime when the most recent file was found,
   * or null if it has never been found.
   */
  last_found_at: string | null
  /**
   * ISO-8601 datetime when the most recent missing-file alert was sent,
   * or null if no alert has been sent.
   */
  last_alerted_at: string | null
  /**
   * Error message from the most recent failed ingestion,
   * or null if the last attempt did not produce an error.
   */
  last_error: string | null
  dup_party_count: number
  zones: CreditReportZoneStatus[]
  /**
   * The most recent N ingestion rows (up to 14), sorted newest-first.
   * Used to render the recent-runs table in the status panel.
   */
  recent: CreditReportIngestionRow[]
}

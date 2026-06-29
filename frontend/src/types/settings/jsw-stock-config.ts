/**
 * Settings — JSW Stock Excel config domain types.
 *
 * Mirrors backend schemas:
 *   - JswStockConfigPublic  → JswStockConfig
 *   - JswStockConfigUpdate  → JswStockConfigInput
 *   - JswStockStatusPublic  → JswStockStatus
 *   - JswStockIngestionRow  → JswStockIngestionRow
 *
 * SPEC: .planning/jsw-stock/SPEC.md §3 types/settings/jsw-stock-config.ts
 * ADDENDUM: A-FE clarifications (FE-9: card owns hook; no id on config).
 */

// ---------------------------------------------------------------------------
// Config — singleton document returned by GET /admin/jsw-stock/config
// ---------------------------------------------------------------------------

/**
 * The JSW Stock Excel ingestion configuration singleton.
 * Backend: JswStockConfigPublic — no `id` field (BE-17: intentional omission).
 */
export interface JswStockConfig {
  /** Whether the scheduled poll job is active. */
  enabled: boolean
  /**
   * Absolute directory path to search for dated sub-folders.
   * The scheduler polls `<base_path>/<dd-mm-yyyy>/<file_name>.xlsx`.
   */
  base_path: string
  /** Excel file name without the `.xlsx` extension (e.g. `"ZSD_CURRSTK_HR"`). */
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
   * Addresses that receive the "JSW STOCK EXCEL not found" alert email.
   * Stored lowercase and deduplicated by the backend.
   */
  notify_emails: string[]
  /**
   * ISO-8601 datetime of the last PUT /admin/jsw-stock/config save,
   * or null if the config was never saved (i.e. still at server defaults).
   */
  updated_at: string | null
}

// ---------------------------------------------------------------------------
// Config input — PUT /admin/jsw-stock/config request body
// ---------------------------------------------------------------------------

/**
 * Form submission shape for saving the JSW Stock config.
 * Identical to JswStockConfig minus `updated_at` (set by the server).
 */
export interface JswStockConfigInput {
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
 * One entry in the JswStockStatus.recent array.
 * Mirrors the backend JswStockIngestionRow schema.
 */
export interface JswStockIngestionRow {
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

// ---------------------------------------------------------------------------
// Status — GET /admin/jsw-stock/status response
// ---------------------------------------------------------------------------

/**
 * Live ingestion status for the JSW Stock poll job.
 * Mirrors the backend JswStockStatusPublic schema.
 */
export interface JswStockStatus {
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
   * ISO-8601 datetime when the poll job last executed (every tick, not just on
   * success), or null if it has never run.
   */
  last_run_at: string | null
  /**
   * Error message from the most recent failed ingestion,
   * or null if the last attempt did not produce an error.
   */
  last_error: string | null
  /**
   * The most recent N ingestion rows (up to 14), sorted newest-first.
   * Used to render the recent-runs table in the status panel.
   */
  recent: JswStockIngestionRow[]
}

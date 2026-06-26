/**
 * Settings — Ingestion folder cleanup config domain types.
 *
 * Mirrors backend schemas (schemas/cleanup_config.py):
 *   - CleanupConfigPublic → CleanupConfig
 *   - CleanupConfigUpdate → CleanupConfigInput
 *
 * The cleanup job deletes whole `<base_path>/<dd-mm-yyyy>` folders older than
 * `retention_days` for each ingestion base path (JSW / JVML / Credit Report).
 * Files only — DB ingestion records are never touched.
 */

/** The cleanup policy singleton (no `id` — keyed by "default" on the backend). */
export interface CleanupConfig {
  /** Whether the daily cleanup job is active. */
  enabled: boolean
  /** Date folders strictly older than this many days are deleted (1–365). */
  retention_days: number
  /** Hour of day (0–23, server LOCAL tz) the daily cleanup runs. */
  run_hour: number
  /** ISO-8601 datetime of the last run, or null if it has never run. */
  last_run_at: string | null
  /** Number of folders deleted on the last run. */
  last_deleted_count: number
  /** ISO-8601 datetime of the last save, or null if never configured. */
  updated_at: string | null
}

/** PUT body for saving the cleanup config (server sets the rest). */
export interface CleanupConfigInput {
  enabled: boolean
  retention_days: number
  run_hour: number
}

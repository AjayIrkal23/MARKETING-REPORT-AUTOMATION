/**
 * Shared structural contracts for the Stock Excel config UI.
 *
 * The JSW and JVML config domains are functionally identical (same form, same
 * status shape) — only the file-name validation and a few labels differ. These
 * structural interfaces let one presentational panel serve both domains; the
 * branded per-domain types (`JswStockConfig`, `JvmlStockConfig`, …) are
 * structurally assignable to them.
 */

// ---------------------------------------------------------------------------
// Data shapes (structural — mirror JswStock* / JvmlStock* domain types)
// ---------------------------------------------------------------------------

/** Editable config fields — the PUT request body shape. */
export interface StockConfigValues {
  enabled: boolean
  base_path: string
  file_name: string
  start_time: string
  end_time: string
  interval_hours: number
  notify_emails: string[]
}

/** Config singleton returned by the server (values + server-set timestamp). */
export interface StockConfig extends StockConfigValues {
  updated_at: string | null
}

/** One row in the recent-runs list. */
export interface StockIngestionRow {
  report_date: string
  status: string
  row_count: number
  found_at: string | null
  created_at: string
}

/** Live ingestion status for the poll job. */
export interface StockStatus {
  enabled: boolean
  last_report_date: string | null
  last_status: string | null
  last_row_count: number | null
  last_found_at: string | null
  last_alerted_at: string | null
  last_error: string | null
  recent: StockIngestionRow[]
}

// ---------------------------------------------------------------------------
// Controller — the structural shape both useJswStockConfig / useJvmlStockConfig
// return. Passed into <StockConfigPanel> so the panel is domain-agnostic.
// ---------------------------------------------------------------------------

export interface StockConfigController {
  config: StockConfig | null
  status: StockStatus | null
  isLoading: boolean
  isSaving: boolean
  isRunning: boolean
  error: string | null
  save: (input: StockConfigValues) => Promise<void>
  runNow: () => Promise<void>
  refetch: () => void
}

// ---------------------------------------------------------------------------
// Domain descriptor — the per-domain copy + validation differences
// ---------------------------------------------------------------------------

export interface StockConfigDomain {
  /** Stable key — also drives unique control ids when multiple panels are mounted. */
  key: "jsw" | "jvml" | "credit_report"
  /** Full heading shown in the panel header. */
  title: string
  /** One-line description of what the job does. */
  description: string
  /** Unique <form> id (submit button targets it via the `form` attribute). */
  formId: string
  /** Prefix for every control id, e.g. "jvml-cfg" → "jvml-cfg-base-path". */
  idPrefix: string
  basePathPlaceholder: string
  fileNamePlaceholder: string
  /** Helper text under the file-name field (rules differ per domain). */
  fileNameHint: string
  /** Returns an error message if the (trimmed) name is invalid, else undefined. */
  validateFileName: (name: string) => string | undefined
  /** Accessible label for the master enable switch. */
  enableAriaLabel: string
  /** Noun used in the "<noun> not found" alert copy, e.g. "JVML STOCK EXCEL". */
  alertNoun: string
}

/**
 * Shared display formatters for the Report JSW/JVML table.
 * INR/quantity formatting + sign colouring, mirroring the credit-report table
 * (`"₹" + toLocaleString("en-IN")`, emerald positive / destructive negative).
 */

/** Coil quantity — Indian grouping, rounded to whole numbers (no decimals). */
export function fmtQty(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—"
  return n.toLocaleString("en-IN", { maximumFractionDigits: 0 })
}

/** INR money — "₹" prefix, Indian grouping, rounded to whole rupees (no decimals). */
export function fmtINR(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—"
  return "₹" + n.toLocaleString("en-IN", { maximumFractionDigits: 0 })
}

/** Tailwind class for a signed value (≥0 emerald, <0 destructive, null muted). */
export function signClass(n: number | null | undefined): string {
  if (n === null || n === undefined) return "text-muted-foreground"
  return n >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"
}

// ---------------------------------------------------------------------------
// Optional (toggleable) trailing columns — controlled by the "Columns" dropdown
// in the toolbar. "Total" and the fixed/RAKE columns are always shown.
// ---------------------------------------------------------------------------

export type ReportColKey =
  | "yes_do"
  | "blocked"
  | "credit_balance"
  | "required_credit"
  | "credit_note"

export type ReportColVisibility = Record<ReportColKey, boolean>

/** Optional columns, in render order, with their toggle labels. */
export const REPORT_OPTIONAL_COLS: { key: ReportColKey; label: string }[] = [
  { key: "yes_do", label: "Yes+DO" },
  { key: "blocked", label: "Blocked" },
  { key: "credit_balance", label: "Credit Balance" },
  { key: "required_credit", label: "Required Credit" },
  { key: "credit_note", label: "Credit Note" },
]

/** Default visibility — everything shown (no column disappears unexpectedly). */
export const DEFAULT_REPORT_COLS: ReportColVisibility = {
  yes_do: true,
  blocked: true,
  credit_balance: true,
  required_credit: true,
  credit_note: true,
}

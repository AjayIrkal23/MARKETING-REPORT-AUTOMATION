/**
 * Shared display formatters + optional-column registry for the Report JSW/JVML table.
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
// Optional (toggleable) columns — controlled by the "Columns" dropdown in the
// toolbar (Detail + RAKE + Credit groups). Only the fixed left cols are always
// shown. Each optional col carries a `side`:
//   "detail" → left columns, between the fixed cols and the RAKE columns
//   "rake"   → the whole block of dynamic RAKE columns (one toggle, all of them)
//   "credit" → trailing columns, right of Total
// ---------------------------------------------------------------------------

/** Toggleable left "detail" columns (drawn from the CustomerCode mapping). */
export type ReportDetailColKey = "transport_mode" | "destination" | "route"

/** Single toggle that shows/hides the whole dynamic RAKE column block. */
export type ReportRakeColKey = "rake"

/** Toggleable trailing columns (after the RAKE columns). "total" is first. */
export type ReportCreditColKey =
  | "total"
  | "yes_do"
  | "blocked"
  | "credit_balance"
  | "required_credit"
  | "credit_note"

export type ReportColKey = ReportDetailColKey | ReportRakeColKey | ReportCreditColKey

export type ReportColSide = "detail" | "rake" | "credit"

export type ReportColVisibility = Record<ReportColKey, boolean>

/** Optional columns, in render order, each tagged with its `side`. */
export const REPORT_OPTIONAL_COLS: {
  key: ReportColKey
  label: string
  side: ReportColSide
}[] = [
  // detail (left, between the fixed cols and the RAKE columns)
  { key: "transport_mode", label: "Transport Mode", side: "detail" },
  { key: "destination", label: "Destination", side: "detail" },
  { key: "route", label: "ROUTE", side: "detail" },
  // rake (the dynamic RAKE column block — one switch for all of them)
  { key: "rake", label: "RAKE columns", side: "rake" },
  // credit (trailing, after the RAKE columns) — "Total" leads the group
  { key: "total", label: "Total", side: "credit" },
  { key: "yes_do", label: "Yes+DO", side: "credit" },
  { key: "blocked", label: "Blocked", side: "credit" },
  { key: "credit_balance", label: "Credit Balance", side: "credit" },
  { key: "required_credit", label: "Required Credit", side: "credit" },
  { key: "credit_note", label: "Credit Note", side: "credit" },
]

/** Default visibility — everything shown (no column disappears unexpectedly). */
export const DEFAULT_REPORT_COLS: ReportColVisibility = {
  transport_mode: true,
  destination: true,
  route: true,
  rake: true,
  total: true,
  yes_do: true,
  blocked: true,
  credit_balance: true,
  required_credit: true,
  credit_note: true,
}

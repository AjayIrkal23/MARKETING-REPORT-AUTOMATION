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

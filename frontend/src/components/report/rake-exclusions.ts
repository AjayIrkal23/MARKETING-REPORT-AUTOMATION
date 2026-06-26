/**
 * RAKE drill-down exclusions — browser-only, session-only.
 *
 * The user unchecks rows inside a RAKE drill-down; those rows are subtracted from
 * the Total Rake Report figures (BOTH the RAKE table and the Transport Mode table)
 * + the drill-down footer, and omitted from the rake_totals / transport-mode /
 * rake_breakdown export sheets. Nothing is persisted (plain state in `useReport`);
 * cleared on regenerate. Row identity = the backend's 8-field merge key
 * (`rake_drilldown.py::row_identity`) so the export can match unchecked rows.
 */

import type {
  RakeDrilldownMergedRow,
  RakeDrilldownRow,
  ReportTypeSelection,
} from "@/types/report/report"

// ASCII Unit Separator — MUST equal the backend `row_identity` separator (chr 31).
const KEY_SEP = String.fromCharCode(31)

// Empty transport mode collapses to "Unknown" to match the backend
// (`generate.py::_compute_totals`: `tm = row.transport_mode or "Unknown"`).
const UNKNOWN_TM = "Unknown"

// 8-field identity in backend order. Both row shapes carry all 8 fields; merged &
// unmerged rows of the same business group therefore share one key (so they toggle
// together — duplicate unmerged lines are indistinguishable, matching the backend).
const IDENTITY_FIELDS = [
  "so_sales_org",
  "distr_chnl",
  "sales_office",
  "sold_to_party",
  "party_code",
  "transport_mode",
  "destination",
  "customer_name",
] as const

type IdentityRow = RakeDrilldownRow | RakeDrilldownMergedRow

/** Canonical identity string for a drill-down row — mirror of backend `row_identity`. */
export function rowKey(row: IdentityRow): string {
  const r = row as unknown as Record<string, unknown>
  return IDENTITY_FIELDS.map((f) => (r[f] ?? "").toString().trim()).join(KEY_SEP)
}

/** One excluded row's stock-scoped qty + its transport-mode bucket. */
export interface ExcludedEntry {
  qty: number  // stock-type-scoped qty (subtract from rake AND transport-mode totals)
  tm: string   // transport-mode bucket ("Unknown" when blank), matching the totals key
}

// rake → (rowKey → excluded entry).
export type RakeExclusions = Record<string, Record<string, ExcludedEntry>>

export function isExcluded(excl: RakeExclusions, rake: string | null, key: string): boolean {
  return rake !== null && excl[rake]?.[key] !== undefined
}

/** Σ excluded qty for one rake — what to subtract from its Total Rake figure. */
export function subtractFor(excl: RakeExclusions, rake: string): number {
  const group = excl[rake]
  if (!group) return 0
  let sum = 0
  for (const k in group) sum += group[k].qty
  return sum
}

/** transport-mode → Σ excluded qty (across all rakes) — for the Transport Mode table. */
export function transportSubtract(excl: RakeExclusions): Record<string, number> {
  const out: Record<string, number> = {}
  for (const rake in excl) {
    const group = excl[rake]
    for (const k in group) {
      const e = group[k]
      out[e.tm] = (out[e.tm] ?? 0) + e.qty
    }
  }
  return out
}

/**
 * The stock-type-scoped qty + transport mode an excluded key contributes. `both`
 * counts every matching unmerged row; single jsw/jvml counts only its own
 * collection (the drill-down is a union superset of the report_type-scoped total).
 */
export function matchInfoFor(
  rows: RakeDrilldownRow[],
  key: string,
  reportType: ReportTypeSelection,
): ExcludedEntry {
  let qty = 0
  let tm = UNKNOWN_TM
  for (const r of rows) {
    if (rowKey(r) !== key) continue
    tm = r.transport_mode || UNKNOWN_TM  // same for every row in the group (in the key)
    if (reportType === "both" || r.stock_type === reportType) qty += r.stock_quantity
  }
  return { qty, tm }
}

/** Wire body for the export POST: rake → { keys, subtract }. Empty rakes dropped. */
export function toExportBody(
  excl: RakeExclusions,
): Record<string, { keys: string[]; subtract: number }> {
  const out: Record<string, { keys: string[]; subtract: number }> = {}
  for (const rake in excl) {
    const keys = Object.keys(excl[rake])
    if (keys.length > 0) out[rake] = { keys, subtract: subtractFor(excl, rake) }
  }
  return out
}

/**
 * report-grouping — pure `buildRenderRows(rows, groupBy)` for the RAKE pivot.
 *
 * Walks the backend-pre-sorted rows (SO Sales Org → Distr.Chnl → BRANCH →
 * Sold To Party → Party Code → Ship-To Party → …) into a flat render list of:
 *   - data rows, with leading "fixed" cells flagged for blanking when they repeat
 *     the parent above (visual grouping), and
 *   - a subtotal row at the bottom of each group (summing RAKE / Total / Yes+DO /
 *     Required Credit).
 *
 * `groupBy` picks the first grouping field: `"distr_chnl"` (single JSW/JVML —
 * subtotal per Distr.Channel, SO Sales Org not shown) or `"so_sales_org"` (Both
 * mode — subtotal per SO Sales Org, which leads the fixed columns). Grouping
 * relies on the backend sort order: boundaries are detected by comparing adjacent
 * rows, so it only works because rows are contiguous by the hierarchy.
 */

import type { ReportPivotRow } from "@/types/report/report"

/**
 * Leading "fixed" columns eligible for repeated-parent blanking, left → right.
 * BRANCH (sales_office) is 2nd so each unique branch heads its items (grouped
 * pivot column) under Distr. Channel, above Sold To Party.
 */
export const FIXED_COL_KEYS = [
  "distr_chnl",
  "sales_office",
  "sold_to_party",
  "party_code",
  "ship_to_party",
] as const

/** `so_sales_org` is blankable/groupable too — only rendered in Both mode. */
export type FixedColKey = "so_sales_org" | (typeof FIXED_COL_KEYS)[number]

/** Pivot grouping dimension: per-channel (single JSW/JVML) or per-SO-Sales-Org (Both). */
export type GroupBy = "distr_chnl" | "so_sales_org"

/** Summed values for a subtotal / grand-total row. */
export interface ReportAgg {
  rake_quantities: Record<string, number>
  total: number
  nco_yes_do: number
  required_credit: number | null
}

export interface RenderDataRow {
  kind: "data"
  row: ReportPivotRow
  /** true → blank this leading cell (it repeats the parent above). */
  blank: Record<FixedColKey, boolean>
}

export interface RenderSubtotalRow {
  kind: "subtotal"
  label: string
  agg: ReportAgg
}

export type RenderRow = RenderDataRow | RenderSubtotalRow

function emptyAgg(): ReportAgg {
  return { rake_quantities: {}, total: 0, nco_yes_do: 0, required_credit: null }
}

function addToAgg(agg: ReportAgg, row: ReportPivotRow): void {
  for (const [k, v] of Object.entries(row.rake_quantities)) {
    agg.rake_quantities[k] = (agg.rake_quantities[k] ?? 0) + (v ?? 0)
  }
  agg.total += row.total ?? 0
  agg.nco_yes_do += row.nco_yes_do ?? 0
  if (row.required_credit !== null && row.required_credit !== undefined) {
    agg.required_credit = (agg.required_credit ?? 0) + row.required_credit
  }
}

/**
 * Group identity. `distr_chnl` mode: SO Sales Org + Distr.Chnl (same channel
 * label can recur across orgs). `so_sales_org` mode: SO Sales Org alone.
 */
function groupKey(row: ReportPivotRow, groupBy: GroupBy): string {
  return groupBy === "so_sales_org"
    ? row.so_sales_org ?? ""
    : `${row.so_sales_org ?? ""} ${row.distr_chnl ?? ""}`
}

function subtotalLabel(row: ReportPivotRow, groupBy: GroupBy): string {
  return groupBy === "so_sales_org"
    ? `${row.so_sales_org ?? "—"} Total`
    : `${row.distr_chnl ?? "—"} Total`
}

function blankFlags(
  row: ReportPivotRow,
  prev: ReportPivotRow | null,
  keys: readonly FixedColKey[],
): Record<FixedColKey, boolean> {
  const flags = {} as Record<FixedColKey, boolean>
  let parentSame = prev !== null
  for (const key of keys) {
    // Blank only while the whole parent chain above also matches the previous row.
    const same = parentSame && prev !== null && (prev[key] ?? null) === (row[key] ?? null)
    flags[key] = same
    parentSame = same
  }
  return flags
}

/**
 * Walk pre-sorted rows into data + per-group subtotal render rows.
 * Repeated parents are blanked only within a group (reset at each subtotal).
 * In `so_sales_org` mode the SO Sales Org column leads the blankable chain.
 */
export function buildRenderRows(
  rows: ReportPivotRow[],
  groupBy: GroupBy = "distr_chnl",
): RenderRow[] {
  const blankKeys: readonly FixedColKey[] =
    groupBy === "so_sales_org"
      ? (["so_sales_org", ...FIXED_COL_KEYS] as FixedColKey[])
      : FIXED_COL_KEYS

  const out: RenderRow[] = []
  let prev: ReportPivotRow | null = null
  let agg = emptyAgg()

  rows.forEach((row, i) => {
    const startsNewGroup =
      prev === null || groupKey(prev, groupBy) !== groupKey(row, groupBy)

    if (startsNewGroup && prev !== null) {
      out.push({ kind: "subtotal", label: subtotalLabel(prev, groupBy), agg })
      agg = emptyAgg()
      prev = null // new group → show the full parent chain again
    }

    out.push({ kind: "data", row, blank: blankFlags(row, prev, blankKeys) })
    addToAgg(agg, row)
    prev = row

    if (i === rows.length - 1) {
      out.push({ kind: "subtotal", label: subtotalLabel(row, groupBy), agg })
    }
  })

  return out
}

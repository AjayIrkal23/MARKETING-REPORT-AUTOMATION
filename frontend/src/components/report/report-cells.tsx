/**
 * report-cells — trailing cell builders (Total + credit cols) for the RAKE pivot.
 *
 * Split out of ReportPivotTable to keep that file ≤250 lines (helper module, not a
 * component module — hence the react-refresh exception). Owns:
 *   - TRAILING_META: header label + class per trailing column
 *   - trailingBodyCell: a data-row cell
 *   - aggTrailingCell: a subtotal / grand-total cell (only Total, Yes+DO and
 *     Required Credit aggregate; Blocked / Credit Balance / Credit Note are
 *     per-row and render blank in aggregate rows)
 */

/* eslint-disable react-refresh/only-export-components */

import { TableCell } from "@/components/ui/table"
import { cn } from "@/lib/utils"
import type { ReportPivotRow } from "@/types/report/report"
import type { ReportAgg } from "./report-grouping"
import { fmtQty, fmtINR, signClass, type ReportCreditColKey } from "./report-format"

/** The trailing columns (Total + credit), all toggleable via the Columns dropdown. */
export type TrailingKey = ReportCreditColKey

export const TRAILING_META: Record<TrailingKey, { label: string; thClass: string }> = {
  total: { label: "Total", thClass: "text-right min-w-[90px]" },
  yes_do: { label: "Yes+DO", thClass: "text-center min-w-[100px]" },
  blocked: { label: "Blocked", thClass: "text-center min-w-[90px]" },
  credit_balance: { label: "Credit Balance", thClass: "text-right min-w-[120px]" },
  required_credit: { label: "Required Credit", thClass: "text-right min-w-[120px]" },
  credit_note: { label: "Credit Note", thClass: "text-center min-w-[140px]" },
}

function BlockedCell({ blocked, creditStatus }: { blocked: boolean | null; creditStatus: string }) {
  if (creditStatus === "NO CREDIT REPORT FOUND") {
    return <span className="text-xs italic text-amber-600">N/A</span>
  }
  if (blocked === null) return <span className="text-muted-foreground/60">—</span>
  if (blocked)
    return (
      <span className="inline-flex items-center rounded-full bg-destructive/10 px-2 py-0.5 text-[11px] font-semibold text-destructive">
        Blocked
      </span>
    )
  return (
    <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
      No
    </span>
  )
}

function CreditBalanceCell({ row }: { row: ReportPivotRow }) {
  if (row.credit_status === "NO CREDIT REPORT FOUND") {
    return <span className="text-xs italic text-amber-600">NO CREDIT REPORT FOUND</span>
  }
  if (row.credit_status === "No Credit balance") {
    return <span className="text-xs italic text-muted-foreground">No Credit balance</span>
  }
  return (
    <span className={cn("tabular-nums", signClass(row.credit_balance))}>
      {fmtINR(row.credit_balance)}
    </span>
  )
}

function CreditNoteCell({ note }: { note: string }) {
  const cls =
    note === "Balance Available"
      ? "text-emerald-600 dark:text-emerald-400"
      : note === "Not Enough Balance" || note === "Balance Negative"
        ? "text-destructive"
        : "text-muted-foreground italic"
  return <span className={cn("text-xs font-medium", cls)}>{note || "—"}</span>
}

/** One trailing cell for a data row. */
export function trailingBodyCell(key: TrailingKey, row: ReportPivotRow) {
  switch (key) {
    case "total":
      return <TableCell className="text-right tabular-nums font-medium">{fmtQty(row.total)}</TableCell>
    case "yes_do":
      return (
        <TableCell
          className="text-center tabular-nums text-muted-foreground text-xs"
          title={`${row.nco_yes_do_count} delivery(s) with NCO Yes + DO`}
        >
          {row.nco_yes_do ? fmtQty(row.nco_yes_do) : "—"}
        </TableCell>
      )
    case "blocked":
      return <TableCell className="text-center"><BlockedCell blocked={row.blocked} creditStatus={row.credit_status} /></TableCell>
    case "credit_balance":
      return <TableCell className="text-right"><CreditBalanceCell row={row} /></TableCell>
    case "required_credit":
      return (
        <TableCell className="text-right tabular-nums text-xs">
          {row.required_credit !== null ? fmtINR(row.required_credit) : "—"}
        </TableCell>
      )
    case "credit_note":
      return <TableCell className="text-center"><CreditNoteCell note={row.credit_note} /></TableCell>
  }
}

/** One trailing cell for a subtotal / grand-total row (sums only). */
export function aggTrailingCell(key: TrailingKey, agg: ReportAgg) {
  switch (key) {
    case "total":
      return <TableCell className="text-right tabular-nums">{fmtQty(agg.total)}</TableCell>
    case "yes_do":
      return (
        <TableCell className="text-center tabular-nums text-muted-foreground text-xs">
          {agg.nco_yes_do ? fmtQty(agg.nco_yes_do) : "—"}
        </TableCell>
      )
    case "required_credit":
      return (
        <TableCell className="text-right tabular-nums text-xs">
          {agg.required_credit !== null ? fmtINR(agg.required_credit) : "—"}
        </TableCell>
      )
    default:
      return <TableCell />
  }
}

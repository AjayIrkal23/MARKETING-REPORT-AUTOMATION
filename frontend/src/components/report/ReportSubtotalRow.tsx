/**
 * ReportSubtotalRow — a channel-subtotal row or the grand-total row.
 * Totals only the COILS (Total + Yes+DO quantities). The amount columns
 * (Credit Balance / Required ₹ / Credit Note) are NOT aggregated — per request,
 * only the coil total is summed, not the money.
 */

import { TableCell, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { fmtQty } from "./report-format"

export interface ReportSubtotalRowProps {
  label: string
  total: number
  ncoYesDo: number
  variant?: "subtotal" | "grand"
}

export function ReportSubtotalRow({
  label, total, ncoYesDo, variant = "subtotal",
}: ReportSubtotalRowProps) {
  const grand = variant === "grand"
  const rowCls = grand
    ? "bg-primary/10 font-semibold"
    : "bg-muted/40 font-medium"

  return (
    <TableRow className={cn(rowCls, "hover:bg-transparent")}>
      <TableCell colSpan={3} className="text-right text-sm text-foreground">
        {label}
      </TableCell>
      <TableCell className="text-right tabular-nums">{fmtQty(total)}</TableCell>
      <TableCell className="text-center tabular-nums text-muted-foreground">
        {ncoYesDo ? fmtQty(ncoYesDo) : "—"}
      </TableCell>
      {/* Amount columns (Blocked / Credit Balance / Credit Note) are
          intentionally NOT totalled — only the coil quantity is summed. */}
      <TableCell />
      <TableCell />
      <TableCell />
    </TableRow>
  )
}

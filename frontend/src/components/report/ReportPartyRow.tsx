/**
 * ReportPartyRow — one party row in the Report JSW/JVML pivot.
 * Cols: Party Code · Sold To Party · Ship-To Party · Route · Route Desc · Total ·
 *   NCO Yes+DO · Blocked · Credit Balance · Required ₹ · Credit Note. All values
 *   come from the backend.
 */

import { TableCell, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { fmtQty, fmtINR, signClass } from "./report-format"
import type { ReportParty } from "@/types/report/report"

function BlockedCell({ blocked, creditStatus }: { blocked: boolean | null; creditStatus: string }) {
  // Blocked is a credit-report-derived column → mirror the "no report" sentinel.
  if (creditStatus === "NO CREDIT REPORT FOUND") {
    return <span className="text-xs italic text-amber-600">N/A</span>
  }
  if (blocked === null) return <span className="text-muted-foreground/60">—</span>
  if (blocked) return <Badge variant="destructive">Blocked</Badge>
  return <span className="font-medium text-emerald-600 dark:text-emerald-400">No</span>
}

function CreditBalanceCell({ party }: { party: ReportParty }) {
  if (party.credit_status === "NO CREDIT REPORT FOUND") {
    return <span className="text-xs italic text-amber-600">NO CREDIT REPORT FOUND</span>
  }
  if (party.credit_status === "No Credit balance") {
    return <span className="text-xs italic text-muted-foreground">No Credit balance</span>
  }
  return (
    <span className={cn("tabular-nums", signClass(party.credit_balance))}>
      {fmtINR(party.credit_balance)}
    </span>
  )
}

/** Credit Note — verdict label, color-coded. */
function CreditNoteCell({ note }: { note: string }) {
  const cls =
    note === "Balance Available"
      ? "text-emerald-600 dark:text-emerald-400"
      : note === "Not Enough Balance" || note === "Balance Negative"
        ? "text-destructive"
        : "text-muted-foreground italic"
  return <span className={cn("text-xs font-medium", cls)}>{note || "—"}</span>
}

export function ReportPartyRow({ party }: { party: ReportParty }) {
  return (
    <TableRow>
      <TableCell className="font-mono text-xs text-foreground">{party.party_code}</TableCell>

      <TableCell className="max-w-[220px]">
        <span className="block truncate text-sm" title={party.sold_to_party ?? undefined}>
          {party.sold_to_party ?? "—"}
        </span>
      </TableCell>

      <TableCell className="max-w-[220px]">
        <span className="block truncate text-sm" title={party.ship_to_party ?? undefined}>
          {party.ship_to_party ?? "—"}
        </span>
      </TableCell>

      <TableCell className="max-w-[120px]">
        <span className="block truncate text-sm text-muted-foreground" title={party.route ?? undefined}>
          {party.route ?? "—"}
        </span>
      </TableCell>

      <TableCell className="max-w-[180px]">
        <span className="block truncate text-sm text-muted-foreground" title={party.route_desc ?? undefined}>
          {party.route_desc ?? "—"}
        </span>
      </TableCell>

      <TableCell className="text-right tabular-nums font-medium">{fmtQty(party.total)}</TableCell>

      <TableCell
        className="text-center tabular-nums text-muted-foreground"
        title={`${party.nco_yes_do_count} delivery(s) with NCO Yes + DO`}
      >
        {party.nco_yes_do ? fmtQty(party.nco_yes_do) : "—"}
      </TableCell>

      <TableCell className="text-center">
        <BlockedCell blocked={party.blocked} creditStatus={party.credit_status} />
      </TableCell>

      <TableCell className="text-right"><CreditBalanceCell party={party} /></TableCell>

      <TableCell className="text-center"><CreditNoteCell note={party.credit_note} /></TableCell>
    </TableRow>
  )
}

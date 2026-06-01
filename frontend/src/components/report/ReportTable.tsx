/**
 * ReportTable — the grouped "Coil Stock" pivot.
 *
 * For each channel: a group-header row (Distr.Chnl) → party rows → a channel
 * subtotal row. A grand-total row sits in the TableFooter. Read-only; all values
 * come from the backend `ReportResponse`.
 */

import { Fragment } from "react"
import {
  Table, TableBody, TableFooter, TableHead, TableHeader, TableRow, TableCell,
} from "@/components/ui/table"
import { Boxes } from "lucide-react"
import { cn } from "@/lib/utils"
import { ReportPartyRow } from "./ReportPartyRow"
import { ReportSubtotalRow } from "./ReportSubtotalRow"
import type { ReportResponse } from "@/types/report/report"

// Explicit per-column alignment + min-widths so numeric (NCO) and status
// (Blocked) columns don't visually collide.
const COLUMNS: { label: string; className: string }[] = [
  { label: "Party Code",     className: "min-w-[90px]" },
  { label: "Sold To Party",  className: "min-w-[160px]" },
  { label: "Route Desc",     className: "min-w-[140px]" },
  { label: "Total",          className: "text-right min-w-[90px]" },
  { label: "Yes+DO",         className: "text-right min-w-[100px]" },
  { label: "Blocked",        className: "text-center min-w-[90px]" },
  { label: "Credit Balance", className: "text-right min-w-[120px]" },
  { label: "Credit Note",    className: "text-center min-w-[140px]" },
]
const COL_COUNT = COLUMNS.length

export function ReportTable({ report }: { report: ReportResponse }) {
  if (report.channels.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground">
        <Boxes className="size-8 opacity-40" aria-hidden />
        <p className="text-sm font-medium">No matching stock rows</p>
        <p className="text-xs opacity-70">
          No parties matched this date{report.region_id ? " for the selected region" : ""}.
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            {COLUMNS.map((c) => (
              <TableHead key={c.label} className={cn("whitespace-nowrap", c.className)}>
                {c.label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>

        <TableBody>
          {report.channels.map((channel) => (
            <Fragment key={channel.distr_chnl}>
              {/* Channel group header */}
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={COL_COUNT}
                  className="bg-muted/60 text-xs font-semibold uppercase tracking-wide text-foreground"
                >
                  {channel.distr_chnl}
                </TableCell>
              </TableRow>

              {/* Party rows */}
              {channel.parties.map((party) => (
                <ReportPartyRow key={`${channel.distr_chnl}-${party.party_code}`} party={party} />
              ))}

              {/* Channel subtotal */}
              <ReportSubtotalRow
                label={`${channel.distr_chnl} Total`}
                total={channel.subtotal}
                ncoYesDo={channel.subtotal_nco_yes_do}
              />
            </Fragment>
          ))}
        </TableBody>

        <TableFooter>
          <ReportSubtotalRow
            label="Grand Total"
            total={report.grand_total}
            ncoYesDo={report.grand_nco_yes_do}
            variant="grand"
          />
        </TableFooter>
      </Table>
    </div>
  )
}

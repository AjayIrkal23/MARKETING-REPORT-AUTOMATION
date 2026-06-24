/**
 * StockLastRun — compact last-run status for a stock config panel.
 *
 * Replaces the old right-hand StatusRail status section. A tight header (label
 * + enabled pill), then either a two-column stat grid (report date / status /
 * rows / found) or an "awaiting first run" empty state, followed by any recent
 * runs. Built to sit full-width beneath the form in a single-column card so two
 * panels read side by side. Shared by both stock config panels.
 */
import type { ReactNode } from "react"
import { format, parseISO } from "date-fns"
import { Activity, Inbox } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import type { StockIngestionRow, StockStatus } from "./types"

type BadgeVariant = "default" | "secondary" | "destructive" | "outline"

const STATUS_LABELS: Record<string, { label: string; variant: BadgeVariant }> = {
  ingested: { label: "Ingested", variant: "default" },
  partial: { label: "Partial", variant: "outline" },
  pending: { label: "Pending", variant: "secondary" },
  missing: { label: "Missing", variant: "outline" },
  alerted: { label: "Alerted", variant: "destructive" },
  error: { label: "Error", variant: "destructive" },
}

function fmtDateTime(iso: string | null): string {
  if (!iso) return "—"
  try {
    return format(parseISO(iso), "dd MMM, HH:mm")
  } catch {
    return iso
  }
}

function statusBadge(s: string | null) {
  if (!s) return null
  return STATUS_LABELS[s] ?? { label: s, variant: "outline" as BadgeVariant }
}

function Stat({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-[0.625rem] font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium text-foreground">{children}</dd>
    </div>
  )
}

export function StockLastRun({ status, isLoading }: { status: StockStatus | null; isLoading: boolean }) {
  const lastInfo = statusBadge(status?.last_status ?? null)
  const hasRun = Boolean(status?.last_status || status?.last_found_at || status?.last_report_date)

  return (
    <section className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Activity className="size-3.5 text-muted-foreground" aria-hidden />
          <p className="text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">Last run</p>
        </div>
        {status && (
          <Badge variant={status.enabled ? "default" : "secondary"} className="text-[10px]">
            {status.enabled ? "Active" : "Paused"}
          </Badge>
        )}
      </div>

      {isLoading && !status ? (
        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </div>
      ) : hasRun ? (
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
          <Stat label="Report date">
            <span className="font-mono">{status?.last_report_date ?? "—"}</span>
          </Stat>
          <Stat label="Status">
            {lastInfo ? (
              <Badge variant={lastInfo.variant} className="text-[10px]">{lastInfo.label}</Badge>
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </Stat>
          <Stat label="Rows ingested">
            <span className="tabular-nums">
              {status?.last_row_count != null ? status.last_row_count.toLocaleString() : "—"}
            </span>
          </Stat>
          <Stat label="Found at">
            <span className="tabular-nums">{fmtDateTime(status?.last_found_at ?? null)}</span>
          </Stat>
        </dl>
      ) : (
        <div className="flex items-center gap-2.5 rounded-md border border-dashed border-border bg-muted/30 px-3 py-2.5 text-xs text-muted-foreground">
          <Inbox className="size-4 shrink-0" aria-hidden />
          <span>No checks have run yet. Save the config, then run a check.</span>
        </div>
      )}

      {status?.last_error && (
        <div
          role="alert"
          className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs leading-snug break-all text-destructive"
        >
          <span className="font-medium">Last error: </span>
          {status.last_error}
        </div>
      )}

      {status && status.recent.length > 0 && (
        <div className="flex flex-col gap-1 border-t border-border/50 pt-2.5">
          <p className="text-[0.625rem] font-semibold uppercase tracking-wider text-muted-foreground">
            Recent ({status.recent.length})
          </p>
          {status.recent.map((row) => (
            <RecentRow key={row.report_date} row={row} />
          ))}
        </div>
      )}
    </section>
  )
}

function RecentRow({ row }: { row: StockIngestionRow }) {
  const info = statusBadge(row.status)
  return (
    <div className="flex items-center justify-between gap-2 py-1 text-xs">
      <span className="font-mono text-muted-foreground">{row.report_date}</span>
      <div className="flex shrink-0 items-center gap-2">
        {row.row_count > 0 && (
          <span className="tabular-nums text-muted-foreground">{row.row_count.toLocaleString()} rows</span>
        )}
        {info && (
          <Badge variant={info.variant} className="px-1.5 py-0 text-[10px]">{info.label}</Badge>
        )}
      </div>
    </div>
  )
}

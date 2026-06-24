import { format, parseISO } from "date-fns"
import { AlertTriangle, CheckCircle2, Circle, Clock, Loader2, Play } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import type {
  CreditReportStatus,
  CreditReportZoneStatus,
} from "@/types/settings/credit-report-config"

type BadgeVariant = "default" | "secondary" | "destructive" | "outline"

const STATUS_META: Record<string, { label: string; variant: BadgeVariant }> = {
  ingested: { label: "Ingested", variant: "default" },
  pending: { label: "Pending", variant: "secondary" },
  missing: { label: "Missing", variant: "outline" },
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

function ZoneIcon({ status }: { status: string }) {
  if (status === "ingested") return <CheckCircle2 className="size-4 text-emerald-600" />
  if (status === "missing") return <AlertTriangle className="size-4 text-amber-600" />
  if (status === "error") return <AlertTriangle className="size-4 text-destructive" />
  return <Clock className="size-4 text-muted-foreground" />
}

function ZoneRow({
  zone,
  disabled,
  isRunning,
  onRun,
}: {
  zone: CreditReportZoneStatus
  disabled: boolean
  isRunning: boolean
  onRun: (regionId: string) => void
}) {
  const meta = STATUS_META[zone.status] ?? { label: zone.status, variant: "outline" as const }

  return (
    <div className="grid gap-3 border-t border-border/60 py-3 first:border-t-0 sm:grid-cols-[1fr_auto] sm:items-center">
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-2">
          <ZoneIcon status={zone.status} />
          <p className="truncate text-sm font-medium text-foreground">{zone.name}</p>
          <Badge variant={meta.variant} className="text-[10px]">{meta.label}</Badge>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className="tabular-nums">
            {zone.row_count > 0 ? `${zone.row_count.toLocaleString()} rows` : "No rows"}
          </span>
          <span className="tabular-nums">{fmtDateTime(zone.found_at)}</span>
        </div>
        {zone.error && (
          <p className="mt-1 break-all text-xs text-destructive">{zone.error}</p>
        )}
      </div>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => onRun(zone.region_id)}
        disabled={disabled}
        aria-busy={isRunning || undefined}
      >
        {isRunning ? (
          <Loader2 className="size-3.5 animate-spin" aria-hidden />
        ) : (
          <Play className="size-3.5" aria-hidden />
        )}
        Run
      </Button>
    </div>
  )
}

export function CreditReportZonesPanel({
  status,
  isLoading,
  isRunningAll,
  runningZoneId,
  onRunZone,
}: {
  status: CreditReportStatus | null
  isLoading: boolean
  isRunningAll: boolean
  runningZoneId: string | null
  onRunZone: (regionId: string) => Promise<void>
}) {
  const today = format(new Date(), "dd-MM-yyyy")
  const zones = status?.zones ?? []
  const isBusy = isRunningAll || Boolean(runningZoneId)

  return (
    <section className="flex flex-col gap-2">
      <div>
        <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Circle className="size-4 text-primary" aria-hidden />
          Zones
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Today · <span className="font-mono">{today}</span>
        </p>
      </div>

      {isLoading && !status ? (
        <div className="flex flex-col gap-2 py-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : zones.length > 0 ? (
        <div className="flex flex-col">
          {zones.map((zone) => (
            <ZoneRow
              key={zone.region_id}
              zone={zone}
              disabled={isBusy}
              isRunning={runningZoneId === zone.region_id}
              onRun={(regionId) => void onRunZone(regionId)}
            />
          ))}
          {status && status.dup_party_count > 0 && (
            <div className="border-t border-border/60 py-2 text-xs text-amber-700">
              {status.dup_party_count.toLocaleString()} parties seen in more than one zone.
            </div>
          )}
        </div>
      ) : (
        <div className="py-2 text-sm text-muted-foreground">
          No active regions are available for zone ingestion.
        </div>
      )}
    </section>
  )
}

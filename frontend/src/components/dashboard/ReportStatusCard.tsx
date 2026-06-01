/**
 * ReportStatusCard — one dashboard card for a single report domain's *today*
 * ingestion state. Shows the two states the backend computes — EXTRACTED and
 * MISSING — as side-by-side pills (highlighted when active), plus a contextual
 * status line. Pure presentation: every boolean comes from the backend.
 */

import { CheckCircle2, AlertTriangle, Circle } from "lucide-react"
import { format } from "date-fns"

import { Card, CardHeader, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { REPORT_ICONS } from "./report-card-config"
import type { DashboardReportStatus } from "@/types/dashboard/summary"

// ── Status line (presentation-only derivation) ─────────────────────────────────

type Tone = "emerald" | "red" | "amber" | "muted"

const TONE_TEXT: Record<Tone, string> = {
  emerald: "text-emerald-600",
  red: "text-destructive",
  amber: "text-amber-600",
  muted: "text-muted-foreground",
}

function statusNote(r: DashboardReportStatus): { text: string; tone: Tone } {
  if (r.status === "error") return { text: "Ingestion error today", tone: "red" }
  if (r.extracted) {
    const at = r.found_at ? ` · ${format(new Date(r.found_at), "HH:mm")}` : ""
    return { text: `Extracted today${at}`, tone: "emerald" }
  }
  if (r.missing) return { text: "File not received for today", tone: "red" }
  if (!r.enabled) return { text: "Scheduled polling disabled", tone: "muted" }
  return { text: "Awaiting today's report", tone: "amber" }
}

// ── StatPill — one of the two state indicators ─────────────────────────────────

interface StatPillProps {
  label: string
  active: boolean
  /** Tone applied when active. */
  tone: Exclude<Tone, "amber" | "muted">
  /** Secondary detail line (e.g. row count). */
  detail: string
  ActiveIcon: typeof CheckCircle2
}

function StatPill({ label, active, tone, detail, ActiveIcon }: StatPillProps) {
  const Icon = active ? ActiveIcon : Circle
  const toneCls = active
    ? tone === "emerald"
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600"
      : "border-destructive/30 bg-destructive/10 text-destructive"
    : "border-border bg-muted/30 text-muted-foreground"

  return (
    <div className={cn("flex flex-col gap-1 rounded-lg border px-3 py-2.5", toneCls)}>
      <span className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide">
        <Icon className="size-3.5 shrink-0" aria-hidden />
        {label}
      </span>
      <span
        className={cn(
          "text-sm font-semibold tabular-nums",
          active ? "" : "text-muted-foreground/70",
        )}
      >
        {detail}
      </span>
    </div>
  )
}

// ── Card ───────────────────────────────────────────────────────────────────────

export function ReportStatusCard({ report }: { report: DashboardReportStatus }) {
  const Icon = REPORT_ICONS[report.key]
  const note = statusNote(report)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <span
              aria-hidden
              className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
            >
              <Icon className="size-4" />
            </span>
            <div>
              <p className="text-sm font-semibold leading-tight text-foreground">
                {report.label}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
                Today · {report.report_date}
              </p>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-3">
        {/* The two backend-computed states, always labelled, lit when active. */}
        <div className="grid grid-cols-2 gap-2.5">
          <StatPill
            label="Extracted"
            active={report.extracted}
            tone="emerald"
            ActiveIcon={CheckCircle2}
            detail={
              report.extracted
                ? `${report.row_count.toLocaleString()} rows`
                : "Not yet"
            }
          />
          <StatPill
            label="Missing"
            active={report.missing}
            tone="red"
            ActiveIcon={AlertTriangle}
            detail={report.missing ? "Not received" : "No"}
          />
        </div>

        {/* Contextual status line. */}
        <p className={cn("flex items-center gap-1.5 text-xs", TONE_TEXT[note.tone])}>
          <span
            aria-hidden
            className="size-1.5 shrink-0 rounded-full bg-current"
          />
          {note.text}
        </p>
      </CardContent>
    </Card>
  )
}

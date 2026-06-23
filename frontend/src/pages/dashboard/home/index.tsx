/**
 * `/home` route — dashboard landing page.
 *
 * Top: three live report-status cards (JSW Stock / JVML Stock / Credit Report)
 * showing today's ingestion state — EXTRACTED / MISSING — backed by
 * `GET /dashboard/summary`. Below: the Analytics "coming soon" placeholder.
 *
 * Thin orchestrator: all server state lives in `useDashboardSummary`; cards are
 * presentational. Route: /home (ProtectedRoute, all authenticated users).
 */

import { LayoutDashboard, AlertCircle, RefreshCw } from "lucide-react"

import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

import { useDashboardSummary } from "@/components/dashboard/hooks/useDashboardSummary"
import { ReportStatusCard } from "@/components/dashboard/ReportStatusCard"
import { AnalyticsComingSoon } from "@/components/dashboard/AnalyticsComingSoon"
import { PageLoading } from "@/components/shared/PageLoading"

// ── Loading skeleton card ──────────────────────────────────────────────────────

function StatusCardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start gap-2.5">
          <Skeleton className="size-9 rounded-lg" />
          <div className="flex flex-col gap-1.5">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-2.5">
          <Skeleton className="h-[58px] rounded-lg" />
          <Skeleton className="h-[58px] rounded-lg" />
        </div>
        <Skeleton className="h-3 w-40" />
      </CardContent>
    </Card>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────

export function HomePage() {
  const { data, loading, error, refetch } = useDashboardSummary()

  return (
    <div className="flex flex-col gap-6">

      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span
            aria-hidden
            className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
          >
            <LayoutDashboard className="size-4" />
          </span>
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-foreground">
              Dashboard
            </h2>
            <p className="mt-0.5 text-sm text-muted-foreground tabular-nums">
              Daily SAP report status{data ? ` · ${data.date}` : ""}
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={refetch}
          disabled={loading}
          className="shrink-0 gap-1.5"
          aria-label="Refresh dashboard status"
        >
          <RefreshCw className={loading ? "size-3.5 animate-spin" : "size-3.5"} />
          Refresh
        </Button>
      </div>

      <Separator />

      {/* ── Report status cards ──────────────────────────────────────────── */}
      {error ? (
        <div
          role="alert"
          className="flex flex-col items-center justify-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 py-12 text-destructive"
        >
          <AlertCircle className="size-7 opacity-70 shrink-0" aria-hidden />
          <p className="text-sm font-medium">Couldn't load report status</p>
          <Button variant="outline" size="sm" onClick={refetch} className="mt-1">
            Try again
          </Button>
        </div>
      ) : loading && data === null ? (
        <PageLoading message="Loading dashboard…" />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data === null
            ? Array.from({ length: 3 }).map((_, i) => <StatusCardSkeleton key={i} />)
            : data.reports.map((report) => (
                <ReportStatusCard key={report.key} report={report} />
              ))}
        </div>
      )}

      {/* ── Analytics (placeholder) ──────────────────────────────────────── */}
      <AnalyticsComingSoon />

    </div>
  )
}

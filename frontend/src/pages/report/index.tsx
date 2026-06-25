/**
 * ReportPage — Report JSW/JVML ("Coil Stock" pivot + credit report).
 *
 * Route: /report (ProtectedRoute, all authenticated users). Thin orchestrator:
 * ReportToolbar (inputs) → states (empty / loading / no-stock / no-credit banner)
 * → ReportPivotTable. All state lives in `useReport`.
 */

import { FileSpreadsheet, AlertCircle, Loader2Icon } from "lucide-react"

import { Separator } from "@/components/ui/separator"

import { useReport } from "@/components/report/hooks/useReport"
import { ReportToolbar } from "@/components/report/ReportToolbar"
import { ReportSection } from "@/components/report/ReportSection"

export function ReportPage() {
  const {
    inputs, data, loading, exporting, error, generate, exportReport, canGenerate,
    setDate, setReportType, setRegionId, setDays, visibleCols, toggleCol,
  } = useReport()

  return (
    <div className="flex flex-col gap-5">

      {/* Header */}
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
        >
          <FileSpreadsheet className="size-4" />
        </span>
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">Report JSW/JVML</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Coil-stock pivot by channel + party, with credit-report checks
          </p>
        </div>
      </div>

      <Separator />

      {/* Inputs */}
      <ReportToolbar
        inputs={inputs}
        loading={loading}
        exporting={exporting}
        canGenerate={canGenerate}
        visibleCols={visibleCols}
        onToggleCol={toggleCol}
        onDate={setDate}
        onReportType={setReportType}
        onRegion={setRegionId}
        onDays={setDays}
        onGenerate={generate}
        onExport={exportReport}
      />

      {/* Error */}
      {error && (
        <div role="alert" className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="size-4 shrink-0" aria-hidden />
          {error}
        </div>
      )}

      {/* Result */}
      {loading ? (
        <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
          <Loader2Icon className="size-8 animate-spin" aria-hidden />
          <p className="text-sm">Generating report…</p>
        </div>
      ) : !data ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          Choose a date, report type, region, and aging filter, then press <strong>Generate</strong>.
        </p>
      ) : (
        <ReportSection
          report={data}
          visibleCols={visibleCols}
          groupBySoOrg={data.report_type === "both"}
        />
      )}
    </div>
  )
}

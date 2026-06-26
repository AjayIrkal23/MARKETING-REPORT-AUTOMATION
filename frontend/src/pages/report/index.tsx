/**
 * ReportPage — Report JSW/JVML ("Coil Stock" pivot + credit report).
 *
 * Route: /report (ProtectedRoute, all authenticated users). Thin orchestrator:
 * ReportToolbar (inputs) → states (empty / loading / no-stock / no-credit banner)
 * → ReportPivotTable. All state lives in `useReport`.
 */

import { FileSpreadsheet, AlertCircle, Loader2Icon } from "lucide-react"

import { useReport } from "@/components/report/hooks/useReport"
import { ReportToolbar } from "@/components/report/ReportToolbar"
import { ReportSection } from "@/components/report/ReportSection"
import { ExportSheetsDialog } from "@/components/report/ExportSheetsDialog"

export function ReportPage() {
  const {
    inputs, data, loading, exporting, error, generate, canGenerate,
    openExportDialog, exportDialogOpen, setExportDialogOpen, confirmExport,
    setDate, setReportType, setRegionId, setDays, visibleCols, toggleCol,
    exclusions, toggleExclusion,
  } = useReport()

  return (
    <div className="flex flex-col gap-5">

      {/* Header */}
      <header className="flex items-start gap-3.5">
        <span
          aria-hidden
          className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15"
        >
          <FileSpreadsheet className="size-[1.15rem]" />
        </span>
        <div className="space-y-1">
          <h2 className="text-xl font-semibold tracking-tight text-foreground">Report JSW/JVML</h2>
          <p className="text-sm text-muted-foreground">
            Coil-stock pivot by channel + party, with credit-report checks
          </p>
        </div>
      </header>

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
        onExport={openExportDialog}
      />

      {/* Export sheet-picker dialog */}
      <ExportSheetsDialog
        open={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
        reportType={inputs.report_type}
        exporting={exporting}
        onConfirm={confirmExport}
      />

      {/* Error */}
      {error && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          <AlertCircle className="mt-px size-4 shrink-0" aria-hidden />
          <span>{error}</span>
        </div>
      )}

      {/* Result */}
      {loading ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card py-16 text-center shadow-xs">
          <span className="flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Loader2Icon className="size-5 animate-spin" aria-hidden />
          </span>
          <p className="text-sm font-medium text-foreground">Generating report…</p>
          <p className="text-xs text-muted-foreground">
            Joining coil stock with the credit report — this can take a moment.
          </p>
        </div>
      ) : !data ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-muted/20 py-16 text-center">
          <span className="flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary">
            <FileSpreadsheet className="size-5" aria-hidden />
          </span>
          <p className="text-sm font-medium text-foreground">No report generated yet</p>
          <p className="max-w-sm text-xs text-muted-foreground">
            Choose a date, report type, region, and aging filter, then press{" "}
            <strong className="font-medium text-foreground">Generate</strong>.
          </p>
        </div>
      ) : (
        <ReportSection
          report={data}
          visibleCols={visibleCols}
          groupBySoOrg={data.report_type === "both"}
          exclusions={exclusions}
          onToggleExclusion={toggleExclusion}
        />
      )}
    </div>
  )
}

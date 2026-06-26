/**
 * useReport — input state + on-demand report generation for the Report JSW/JVML page.
 *
 * Holds the 4 inputs (date, report_type, region_id, days) as a draft; the report
 * is fetched only when `generate()` is called (the pivot+credit join is heavy, so
 * it is explicit, not reactive). `fetchIdRef` guards against a stale response.
 */

import { useCallback, useEffect, useRef, useState } from "react"
import { format } from "date-fns"

import { exportCombined } from "@/api/report/export"
import { generateReport } from "@/api/report/generate"
import { loadPersisted, savePersisted } from "@/hooks/usePersistedState"
import {
  DEFAULT_REPORT_COLS,
  REPORT_OPTIONAL_COLS,
  type ReportColKey,
  type ReportColVisibility,
} from "@/components/report/report-format"
import {
  toExportBody,
  transportSubtract,
  type ExcludedEntry,
  type RakeExclusions,
} from "@/components/report/rake-exclusions"
import type {
  DaysFilter,
  ExportSheetKey,
  ReportResponse,
  ReportTypeSelection,
} from "@/types/report/report"

export interface ReportInputs {
  date: string | null            // "dd-MM-yyyy"
  report_type: ReportTypeSelection
  region_id: string | null
  days: DaysFilter
}

export interface UseReportResult {
  inputs: ReportInputs
  setDate: (date: string | null) => void
  setReportType: (t: ReportTypeSelection) => void
  setRegionId: (id: string | null) => void
  setDays: (d: DaysFilter) => void
  /** The report payload; for "both" the backend merges jsw + jvml into one. null until generated. */
  data: ReportResponse | null
  loading: boolean
  exporting: boolean
  error: string | null
  generate: () => void
  /** Open the export sheet-picker dialog (validates a date is selected first). */
  openExportDialog: () => void
  exportDialogOpen: boolean
  setExportDialogOpen: (open: boolean) => void
  /** Download the combined .xlsx with the picked sheets. */
  confirmExport: (sheets: ExportSheetKey[]) => void
  canGenerate: boolean
  visibleCols: ReportColVisibility
  toggleCol: (key: ReportColKey) => void
  /** Browser-only RAKE drill-down exclusions (session-only; cleared on generate). */
  exclusions: RakeExclusions
  /** Toggle one drill-down row's exclusion for a rake (entry = stock-scoped qty + transport mode). */
  toggleExclusion: (rake: string, key: string, entry: ExcludedEntry) => void
}

export function useReport(): UseReportResult {
  // Persisted across navigation (localStorage, sliding 1h TTL): the draft inputs
  // AND the generated `data` survive away-and-back, resetting only after 1h idle.
  // `data` must be stored too — unlike the list pages, the report has no auto-
  // refetch on mount, so the generated payload would otherwise be lost.
  const [inputs, setInputs] = useState<ReportInputs>(() =>
    loadPersisted("mra:report:inputs", () => ({
      date: format(new Date(), "dd-MM-yyyy"),
      report_type: "jsw",
      region_id: null,
      days: "exclude",
    })),
  )
  const [data, setData] = useState<ReportResponse | null>(() =>
    loadPersisted<ReportResponse | null>("mra:report:data", null),
  )
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [exportDialogOpen, setExportDialogOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [visibleCols, setVisibleCols] = useState<ReportColVisibility>(() =>
    loadPersisted("mra:report:cols", () => ({ ...DEFAULT_REPORT_COLS })),
  )
  // Browser-only, session-only: never persisted, reset on every generate().
  const [exclusions, setExclusions] = useState<RakeExclusions>({})

  const fetchIdRef = useRef(0)

  // Persist inputs + generated report + column visibility across navigation
  // (sliding 1h TTL). Split per-value so the (larger) report payload is only
  // re-serialized when `data` itself changes — not on every input/column tweak.
  // `data` is stored because the report has no auto-refetch on mount, so the
  // generated payload would otherwise be lost on navigation.
  useEffect(() => { savePersisted("mra:report:inputs", inputs) }, [inputs])
  useEffect(() => { savePersisted("mra:report:data", data) }, [data])
  useEffect(() => { savePersisted("mra:report:cols", visibleCols) }, [visibleCols])

  const toggleCol = useCallback(
    (key: ReportColKey) => setVisibleCols((p) => ({ ...p, [key]: !p[key] })),
    [],
  )

  // Add/remove one drill-down row's exclusion (keyed by rake + canonical row key).
  const toggleExclusion = useCallback(
    (rake: string, key: string, entry: ExcludedEntry) =>
      setExclusions((prev) => {
        const group = { ...(prev[rake] ?? {}) }
        if (key in group) delete group[key]
        else group[key] = entry
        const next = { ...prev }
        if (Object.keys(group).length === 0) delete next[rake]
        else next[rake] = group
        return next
      }),
    [],
  )

  // Any toolbar change invalidates the generated drill-down, so drop now-stale
  // exclusions — otherwise an export (which uses live inputs) would re-generate a
  // DIFFERENT report yet apply unchecks computed against the old drill-down.
  const patchInputs = useCallback((patch: Partial<ReportInputs>) => {
    setInputs((p) => ({ ...p, ...patch }))
    setExclusions((prev) => (Object.keys(prev).length ? {} : prev))
  }, [])
  const setDate = useCallback((date: string | null) => patchInputs({ date }), [patchInputs])
  const setReportType = useCallback((report_type: ReportTypeSelection) => patchInputs({ report_type }), [patchInputs])
  const setRegionId = useCallback((region_id: string | null) => patchInputs({ region_id }), [patchInputs])
  const setDays = useCallback((days: DaysFilter) => patchInputs({ days }), [patchInputs])

  const generate = useCallback(() => {
    const date = inputs.date
    if (!date) {
      setError("Select a date first.")
      return
    }
    const id = ++fetchIdRef.current
    setLoading(true)
    setError(null)
    // "both" is one merged call — the backend joins jsw + jvml, grouped by SO Sales Org.
    generateReport({
      date,
      report_type: inputs.report_type,
      region_id: inputs.region_id ?? undefined,
      days: inputs.days,
    })
      .then((result) => {
        if (id !== fetchIdRef.current) return
        setData(result)
        setExclusions({})  // a fresh report starts with every row checked
      })
      .catch(() => {
        if (id !== fetchIdRef.current) return
        setError("Failed to generate the report. Please try again.")
      })
      .finally(() => {
        if (id === fetchIdRef.current) setLoading(false)
      })
  }, [inputs])

  // Export is two-step: open the sheet-picker dialog, then download the picked sheets.
  const openExportDialog = useCallback(() => {
    if (!inputs.date) {
      setError("Select a date first.")
      return
    }
    setError(null)
    setExportDialogOpen(true)
  }, [inputs.date])

  const confirmExport = useCallback(
    (sheets: ExportSheetKey[]) => {
      const date = inputs.date
      if (!date || sheets.length === 0) return
      setExportDialogOpen(false)
      setExporting(true)
      setError(null)
      // The pivot sheet honours the same optional-column toggles as the on-screen table.
      const columns = REPORT_OPTIONAL_COLS.filter((c) => visibleCols[c.key]).map((c) => c.key).join(",")
      // Browser-only RAKE exclusions → POST body; omitted (plain GET) when none.
      // transport_subtract carries the same unchecks regrouped by transport mode.
      const body = toExportBody(exclusions)
      const hasExcl = Object.keys(body).length > 0
      exportCombined({
        date,
        report_type: inputs.report_type,
        region_id: inputs.region_id ?? undefined,
        days: inputs.days,
        columns,
        sheets,
        exclusions: hasExcl ? body : undefined,
        transport_subtract: hasExcl ? transportSubtract(exclusions) : undefined,
      })
        .catch(() => setError("Failed to export the report. Please try again."))
        .finally(() => setExporting(false))
    },
    [inputs, visibleCols, exclusions],
  )

  return {
    inputs,
    setDate,
    setReportType,
    setRegionId,
    setDays,
    data,
    loading,
    exporting,
    error,
    generate,
    openExportDialog,
    exportDialogOpen,
    setExportDialogOpen,
    confirmExport,
    canGenerate: inputs.date !== null,
    visibleCols,
    toggleCol,
    exclusions,
    toggleExclusion,
  }
}

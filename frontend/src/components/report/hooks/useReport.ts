/**
 * useReport — input state + on-demand report generation for the Report JSW/JVML page.
 *
 * Holds the 4 inputs (date, report_type, region_id, days) as a draft; the report
 * is fetched only when `generate()` is called (the pivot+credit join is heavy, so
 * it is explicit, not reactive). `fetchIdRef` guards against a stale response.
 */

import { useCallback, useRef, useState } from "react"
import { format } from "date-fns"

import { exportReport } from "@/api/report/export"
import { generateReport } from "@/api/report/generate"
import type {
  DaysFilter,
  ReportResponse,
  ReportType,
} from "@/types/report/report"

export interface ReportInputs {
  date: string | null            // "dd-MM-yyyy"
  report_type: ReportType
  region_id: string | null
  days: DaysFilter
}

export interface UseReportResult {
  inputs: ReportInputs
  setDate: (date: string | null) => void
  setReportType: (t: ReportType) => void
  setRegionId: (id: string | null) => void
  setDays: (d: DaysFilter) => void
  data: ReportResponse | null
  loading: boolean
  exporting: boolean
  error: string | null
  generate: () => void
  exportReport: () => void
  canGenerate: boolean
}

export function useReport(): UseReportResult {
  const [inputs, setInputs] = useState<ReportInputs>(() => ({
    date: format(new Date(), "dd-MM-yyyy"),
    report_type: "jsw",
    region_id: null,
    days: "include",
  }))
  const [data, setData] = useState<ReportResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchIdRef = useRef(0)

  const setDate = useCallback((date: string | null) => setInputs((p) => ({ ...p, date })), [])
  const setReportType = useCallback((report_type: ReportType) => setInputs((p) => ({ ...p, report_type })), [])
  const setRegionId = useCallback((region_id: string | null) => setInputs((p) => ({ ...p, region_id })), [])
  const setDays = useCallback((days: DaysFilter) => setInputs((p) => ({ ...p, days })), [])

  const generate = useCallback(() => {
    if (!inputs.date) {
      setError("Select a date first.")
      return
    }
    const id = ++fetchIdRef.current
    setLoading(true)
    setError(null)
    generateReport({
      date: inputs.date,
      report_type: inputs.report_type,
      region_id: inputs.region_id ?? undefined,
      days: inputs.days,
    })
      .then((result) => {
        if (id !== fetchIdRef.current) return
        setData(result)
      })
      .catch(() => {
        if (id !== fetchIdRef.current) return
        setError("Failed to generate the report. Please try again.")
      })
      .finally(() => {
        if (id === fetchIdRef.current) setLoading(false)
      })
  }, [inputs])

  const exportReportCallback = useCallback(() => {
    if (!inputs.date) {
      setError("Select a date first.")
      return
    }
    setExporting(true)
    setError(null)
    exportReport({
      date: inputs.date,
      report_type: inputs.report_type,
      region_id: inputs.region_id ?? undefined,
      days: inputs.days,
    })
      .catch(() => setError("Failed to export the report. Please try again."))
      .finally(() => setExporting(false))
  }, [inputs])

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
    exportReport: exportReportCallback,
    canGenerate: inputs.date !== null,
  }
}

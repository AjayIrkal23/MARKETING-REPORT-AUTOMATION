/**
 * `useRakeDrilldown` — drill-down state for clicking a RAKE total.
 *
 * Owns the open RAKE, fetched rows, loading/error. Keeps API calls out of the
 * component (mandatory FE rule). Derives query params from the report itself
 * (date / region / days), so the drill-down matches what was generated.
 */

import { useCallback, useRef, useState } from "react"

import { fetchRakeDrilldown } from "@/api/report/rake-drilldown"
import type {
  RakeDrilldownResponse,
  ReportResponse,
} from "@/types/report/report"

export interface UseRakeDrilldownResult {
  rake: string | null
  data: RakeDrilldownResponse | null
  loading: boolean
  error: string | null
  open: (rake: string) => void
  close: () => void
}

export function useRakeDrilldown(report: ReportResponse): UseRakeDrilldownResult {
  const [rake, setRake] = useState<string | null>(null)
  const [data, setData] = useState<RakeDrilldownResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fetchIdRef = useRef(0)

  const open = useCallback(
    (next: string) => {
      const fetchId = ++fetchIdRef.current
      setRake(next)
      setData(null)
      setError(null)
      setLoading(true)
      fetchRakeDrilldown({
        rake: next,
        date: report.date,
        region_id: report.region_id ?? undefined,
        days: report.days_filter,
      })
        .then((res) => {
          if (fetchId === fetchIdRef.current) setData(res)
        })
        .catch((e: unknown) => {
          if (fetchId === fetchIdRef.current) {
            setError(e instanceof Error ? e.message : "Failed to load drill-down")
          }
        })
        .finally(() => {
          if (fetchId === fetchIdRef.current) setLoading(false)
        })
    },
    [report.date, report.region_id, report.days_filter],
  )

  const close = useCallback(() => {
    fetchIdRef.current++
    setRake(null)
    setData(null)
    setError(null)
    setLoading(false)
  }, [])

  return { rake, data, loading, error, open, close }
}

/**
 * useDashboardSummary — fetches today's per-report ingestion status.
 *
 * Read-only server state {data, loading, error} + a manual `refetch`. No query
 * params (the backend always reports "today"), so there is nothing to debounce;
 * a single fetch on mount plus on-demand refetch is sufficient. `fetchIdRef`
 * guards against a stale response landing after a newer refetch. Mirrors the
 * `doFetch` callback pattern used by `useJswStockList`.
 */

import { useCallback, useEffect, useRef, useState } from "react"

import { getDashboardSummary } from "@/api/dashboard/summary"
import type { DashboardSummary } from "@/types/dashboard/summary"

export interface UseDashboardSummaryResult {
  data: DashboardSummary | null
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useDashboardSummary(): UseDashboardSummaryResult {
  const [data, setData] = useState<DashboardSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Race-safe: discard responses from superseded fetches.
  const fetchIdRef = useRef(0)

  const doFetch = useCallback(async () => {
    const id = ++fetchIdRef.current
    setLoading(true)
    setError(null)
    try {
      const result = await getDashboardSummary()
      if (id !== fetchIdRef.current) return
      setData(result)
    } catch {
      if (id !== fetchIdRef.current) return
      setError("Failed to load dashboard status. Please try again.")
    } finally {
      if (id === fetchIdRef.current) setLoading(false)
    }
  }, [])

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void doFetch() }, [doFetch])

  return { data, loading, error, refetch: doFetch }
}

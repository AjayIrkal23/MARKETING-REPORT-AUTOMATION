/**
 * useAnalyticsDashboard — state and fetch logic for the analytics section.
 *
 * Mirrors the existing list-page hook pattern (custom useState/useEffect with a
 * fetchIdRef race guard). Default date range is the last 7 days, seeded on mount.
 */

import { useCallback, useEffect, useRef, useState } from "react"
import { format } from "date-fns"

import { getAnalyticsDashboard } from "@/api/analytics/dashboard"
import type {
  AnalyticsDashboardData,
  AnalyticsFiltersState,
  AnalyticsQuery,
} from "@/types/analytics/dashboard"

export interface UseAnalyticsDashboardResult {
  fromDate: string
  toDate: string
  setDateRange: (fromDate: string, toDate: string) => void
  filters: AnalyticsFiltersState
  setFilter: <K extends keyof AnalyticsFiltersState>(
    key: K,
    value: AnalyticsFiltersState[K],
  ) => void
  setFilters: (patch: Partial<AnalyticsFiltersState>) => void
  data: AnalyticsDashboardData | null
  loading: boolean
  error: string | null
  refetch: () => void
}

const DEFAULT_FILTERS: AnalyticsFiltersState = {
  reportType: "both",
  region: "",
  days: "include",
  distr_chnl: [],
  sales_office: [],
  customer_name: [],
  segment: [],
  transport_mode: [],
  rake: [],
  route: [],
}

function buildQuery(
  fromDate: string,
  toDate: string,
  filters: AnalyticsFiltersState,
): AnalyticsQuery {
  return {
    reportType: filters.reportType,
    fromDate,
    toDate,
    days: filters.days,
    ...(filters.region ? { region: filters.region } : {}),
    ...(filters.distr_chnl.length ? { distr_chnl: filters.distr_chnl } : {}),
    ...(filters.sales_office.length ? { sales_office: filters.sales_office } : {}),
    ...(filters.customer_name.length ? { customer_name: filters.customer_name } : {}),
    ...(filters.segment.length ? { segment: filters.segment } : {}),
    ...(filters.transport_mode.length ? { transport_mode: filters.transport_mode } : {}),
    ...(filters.rake.length ? { rake: filters.rake } : {}),
    ...(filters.route.length ? { route: filters.route } : {}),
  }
}

export function useAnalyticsDashboard(): UseAnalyticsDashboardResult {
  const today = format(new Date(), "dd-MM-yyyy")

  const [fromDate, setFromDate] = useState(today)
  const [toDate, setToDate] = useState(today)
  const [filters, setFiltersState] = useState<AnalyticsFiltersState>(DEFAULT_FILTERS)
  const [data, setData] = useState<AnalyticsDashboardData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchIdRef = useRef(0)

  const doFetch = useCallback(
    async (fd: string, td: string, f: AnalyticsFiltersState) => {
      const id = ++fetchIdRef.current
      setLoading(true)
      setError(null)
      try {
        const result = await getAnalyticsDashboard(buildQuery(fd, td, f))
        if (id !== fetchIdRef.current) return
        setData(result)
      } catch {
        if (id !== fetchIdRef.current) return
        setError("Failed to load analytics data. Please try again.")
      } finally {
        if (id === fetchIdRef.current) setLoading(false)
      }
    },
    [],
  )

  useEffect(() => {
    void doFetch(fromDate, toDate, filters)
  }, [doFetch, fromDate, toDate, filters])

  const setDateRange = useCallback((fd: string, td: string) => {
    setFromDate(fd)
    setToDate(td)
  }, [])

  const setFilter = useCallback(<K extends keyof AnalyticsFiltersState>(
    key: K,
    value: AnalyticsFiltersState[K],
  ) => {
    setFiltersState((prev) => ({ ...prev, [key]: value }))
  }, [])

  const setFilters = useCallback((patch: Partial<AnalyticsFiltersState>) => {
    setFiltersState((prev) => ({ ...prev, ...patch }))
  }, [])

  const refetch = useCallback(() => {
    void doFetch(fromDate, toDate, filters)
  }, [doFetch, fromDate, toDate, filters])

  return {
    fromDate,
    toDate,
    setDateRange,
    filters,
    setFilter,
    setFilters,
    data,
    loading,
    error,
    refetch,
  }
}

/**
 * useCreditReportList — all state for the Credit Report List page.
 *
 * Owns query state {page,limit,sortBy,sortOrder, 6 filters}, server state
 * {rows,meta,loading,error}, dialog discriminated union, and read-only actions
 * (no mutations — Credit Report is read-only).
 *
 * ALL filtering / sorting / pagination is server-driven via API params.
 * fetchIdRef guards against stale responses from superseded fetches.
 * Filter/sort setters reset page to 1 automatically.
 *
 * Default view: `date` is seeded to TODAY ("dd-MM-yyyy", local day) on mount so
 * the list opens showing only today's report; the user can change or clear it.
 * Filters: a single report-`date` (exact match on report_date) + 7 filters —
 *   4 async-select (customer_name, city, customer, cca_description)
 *   + blocked enum (""|"blocked"|"unblocked")
 *   + credit_balance_sign enum (""|"positive"|"negative")
 *   + plant enum ("all"|"jsw"|"jvml").
 * NO q-search, NO dateFrom/dateTo range.
 */

import { useCallback, useEffect, useRef, useState } from "react"
import { format } from "date-fns"

import { exportCreditReport } from "@/api/credit-report/export"
import { listCreditReport } from "@/api/credit-report/list"

import type { PaginationMeta } from "@/types/api/envelope"
import type {
  CreditReport,
  CreditReportListQuery,
  CreditReportSortBy,
} from "@/types/credit-report/credit-report"
import type {
  CreditReportDialogState,
  CreditReportQueryState,
  UseCreditReportListResult,
} from "@/types/credit-report/credit-report-ui"

// ---------------------------------------------------------------------------
// Default query state — sortBy:"created_at", sortOrder:"desc", all filters ""
// ---------------------------------------------------------------------------

const DEFAULT_QUERY: CreditReportQueryState = {
  page: 1,
  limit: 20,
  sortBy: "created_at",
  sortOrder: "desc",
  date: null,
  customer_name: "",
  city: "",
  customer: "",
  cca_description: "",
  blocked: "",
  credit_balance_sign: "",
  plant: "all",
  region: "",
}

// ---------------------------------------------------------------------------
// Filter-key set — used by clearFilters to reset all 6 per-field filters.
// ---------------------------------------------------------------------------

const FILTER_KEYS = [
  "customer_name",
  "city",
  "customer",
  "cca_description",
  "blocked",
  "credit_balance_sign",
  "plant",
  "region",
] as const satisfies ReadonlyArray<keyof Pick<
  CreditReportQueryState,
  | "customer_name"
  | "city"
  | "customer"
  | "cca_description"
  | "blocked"
  | "credit_balance_sign"
  | "plant"
  | "region"
>>

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useCreditReportList(): UseCreditReportListResult {
  // Lazy initializer: seed `date` to today on mount (not module load) so a
  // long-lived tab still opens on the correct day after midnight.
  const [query, setQuery] = useState<CreditReportQueryState>(() => ({
    ...DEFAULT_QUERY,
    date: format(new Date(), "dd-MM-yyyy"),
  }))
  const [rows, setRows] = useState<CreditReport[]>([])
  const [meta, setMeta] = useState<PaginationMeta | null>(null)
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dialog, setDialog] = useState<CreditReportDialogState>({ type: "none" })

  // Race-safe: discard responses from superseded fetches.
  const fetchIdRef = useRef(0)

  // -------------------------------------------------------------------------
  // doFetch — builds CreditReportListQuery stripping empty filters.
  // buildQuery in client.ts skips undefined/"" but NOT null — spread only when truthy.
  // -------------------------------------------------------------------------

  const doFetch = useCallback(async (q: CreditReportQueryState) => {
    const id = ++fetchIdRef.current
    setLoading(true)
    setError(null)
    try {
      const params: CreditReportListQuery = {
        page: q.page,
        limit: q.limit,
        sortBy: q.sortBy,
        sortOrder: q.sortOrder,
        ...(q.date               ? { date: q.date }                             : {}),
        ...(q.customer_name      ? { customer_name: q.customer_name }           : {}),
        ...(q.city               ? { city: q.city }                             : {}),
        ...(q.customer           ? { customer: q.customer }                     : {}),
        ...(q.cca_description    ? { cca_description: q.cca_description }       : {}),
        ...(q.blocked            ? { blocked: q.blocked }                       : {}),
        ...(q.credit_balance_sign ? { credit_balance_sign: q.credit_balance_sign } : {}),
        ...(q.plant && q.plant !== "all" ? { plant: q.plant }                   : {}),
        ...(q.region              ? { region: q.region }                         : {}),
      }
      const result = await listCreditReport(params)
      if (id !== fetchIdRef.current) return
      setRows(result.data)
      setMeta(result.meta)
    } catch {
      if (id !== fetchIdRef.current) return
      setError("Failed to load credit report data. Please try again.")
    } finally {
      if (id === fetchIdRef.current) setLoading(false)
    }
  }, [])

  // Refetch whenever query object identity changes (also triggered by refetch()).
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void doFetch(query) }, [doFetch, query])

  // ---------------------------------------------------------------------------
  // Param setters — filter/sort changes reset page to 1.
  // ---------------------------------------------------------------------------

  const setPage = useCallback(
    (page: number) => setQuery((q) => ({ ...q, page })),
    [],
  )

  const setLimit = useCallback(
    (limit: number) => setQuery((q) => ({ ...q, limit, page: 1 })),
    [],
  )

  const setSort = useCallback(
    (sortBy: CreditReportSortBy, sortOrder: "asc" | "desc") =>
      setQuery((q) => ({ ...q, sortBy, sortOrder, page: 1 })),
    [],
  )

  /** Single setter covering all 8 filters; resets page to 1. */
  const setFilter = useCallback(
    (patch: Partial<Pick<CreditReportQueryState,
      | "customer_name"
      | "city"
      | "customer"
      | "cca_description"
      | "blocked"
      | "credit_balance_sign"
      | "plant"
      | "region"
    >>) =>
      setQuery((q) => ({ ...q, ...patch, page: 1 })),
    [],
  )

  /** Set the single report-date filter ("dd-MM-yyyy" | null); resets page to 1. */
  const setDate = useCallback(
    (date: string | null) => setQuery((q) => ({ ...q, date, page: 1 })),
    [],
  )

  /** Reset all 8 filters to "" / "all" AND the date to null; resets page to 1. */
  const clearFilters = useCallback(() => {
    const cleared = Object.fromEntries(
      FILTER_KEYS.map((k) => [k, k === "plant" ? "all" : ""]),
    ) as Pick<CreditReportQueryState, typeof FILTER_KEYS[number]>
    setQuery((q) => ({ ...q, ...cleared, date: null, page: 1 }))
  }, [])

  const exportRows = useCallback(
    async (filename?: string) => {
      setExporting(true)
      try {
        const params: CreditReportListQuery = {
          page: query.page,
          limit: query.limit,
          sortBy: query.sortBy,
          sortOrder: query.sortOrder,
          ...(query.date               ? { date: query.date }                             : {}),
          ...(query.customer_name      ? { customer_name: query.customer_name }           : {}),
          ...(query.city               ? { city: query.city }                             : {}),
          ...(query.customer           ? { customer: query.customer }                     : {}),
          ...(query.cca_description    ? { cca_description: query.cca_description }       : {}),
          ...(query.blocked            ? { blocked: query.blocked }                       : {}),
          ...(query.credit_balance_sign ? { credit_balance_sign: query.credit_balance_sign } : {}),
          ...(query.plant && query.plant !== "all" ? { plant: query.plant }               : {}),
          ...(query.region             ? { region: query.region }                         : {}),
        }
        await exportCreditReport(params, filename)
      } finally {
        setExporting(false)
      }
    },
    [query],
  )

  // Trigger re-fetch without changing params (identity change → useEffect fires).
  const refetch = useCallback(() => setQuery((q) => ({ ...q })), [])

  const openDialog = useCallback((d: CreditReportDialogState) => setDialog(d), [])
  const closeDialog = useCallback(() => setDialog({ type: "none" }), [])

  // ---------------------------------------------------------------------------
  // Return value — matches UseCreditReportListResult exactly.
  // ---------------------------------------------------------------------------

  return {
    query,
    setPage,
    setLimit,
    setSort,
    setFilter,
    setDate,
    clearFilters,
    rows,
    meta,
    loading,
    exporting,
    exportRows,
    error,
    dialog,
    openDialog,
    closeDialog,
    refetch,
  }
}

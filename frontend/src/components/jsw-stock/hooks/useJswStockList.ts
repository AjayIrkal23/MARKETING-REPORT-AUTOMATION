/**
 * useJswStockList — all state for the JSW Stock List page.
 *
 * Owns query state {page,limit,sortBy,sortOrder,date,4 filters}, server state
 * {rows,meta,loading,error}, dialog discriminated union, and read-only actions
 * (no mutations — JSW Stock is read-only).
 *
 * ALL filtering / sorting / pagination is server-driven via API params.
 * fetchIdRef guards against stale responses from superseded fetches.
 * Filter/sort/date setters reset page to 1 automatically.
 *
 * Default view: `date` is seeded to TODAY ("dd-MM-yyyy", local day) on mount so
 * the list opens showing only today's report. The user can change or clear it.
 */

import { useCallback, useEffect, useRef, useState } from "react"
import { format } from "date-fns"

import { listJswStock } from "@/api/jsw-stock/list"

import type { PaginationMeta } from "@/types/api/envelope"
import type {
  JswStock,
  JswStockField,
  JswStockListQuery,
  JswStockSortBy,
} from "@/types/jsw-stock/stock"
import type {
  JswStockDialogState,
  JswStockQueryState,
  UseJswStockListResult,
} from "@/types/jsw-stock/stock-ui"

// ---------------------------------------------------------------------------
// Default query state — sortBy:"created_at", sortOrder:"desc", all filters ""
// ---------------------------------------------------------------------------

const DEFAULT_QUERY: JswStockQueryState = {
  page: 1,
  limit: 20,
  sortBy: "created_at",
  sortOrder: "desc",
  date: null,
  party_code: "",
  sales_order_type: "",
  customer_name: "",
  sales_office: "",
  nco_declared: "",
}

// ---------------------------------------------------------------------------
// Filter-key set — used by clearFilters to reset per-field filters only.
// satisfies ensures all 5 values are valid JswStockField members.
// ---------------------------------------------------------------------------

const FILTER_KEYS = [
  "party_code",
  "sales_order_type",
  "customer_name",
  "sales_office",
  "nco_declared",
] as const satisfies ReadonlyArray<JswStockField>

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useJswStockList(): UseJswStockListResult {
  // Lazy initializer: seed `date` to today on mount (not module load) so a
  // long-lived tab still opens on the correct day after midnight.
  const [query, setQuery] = useState<JswStockQueryState>(() => ({
    ...DEFAULT_QUERY,
    date: format(new Date(), "dd-MM-yyyy"),
  }))
  const [rows, setRows] = useState<JswStock[]>([])
  const [meta, setMeta] = useState<PaginationMeta | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dialog, setDialog] = useState<JswStockDialogState>({ type: "none" })

  // Race-safe: discard responses from superseded fetches.
  const fetchIdRef = useRef(0)

  // -------------------------------------------------------------------------
  // doFetch — builds JswStockListQuery stripping empty filters + null date.
  // buildQuery in client.ts skips undefined/"" but NOT null — spread only when truthy.
  // -------------------------------------------------------------------------

  const doFetch = useCallback(async (q: JswStockQueryState) => {
    const id = ++fetchIdRef.current
    setLoading(true)
    setError(null)
    try {
      const params: JswStockListQuery = {
        page: q.page,
        limit: q.limit,
        sortBy: q.sortBy,
        sortOrder: q.sortOrder,
        ...(q.date             ? { date: q.date }                             : {}),
        ...(q.party_code       ? { party_code: q.party_code }                 : {}),
        ...(q.sales_order_type ? { sales_order_type: q.sales_order_type }     : {}),
        ...(q.customer_name    ? { customer_name: q.customer_name }           : {}),
        ...(q.sales_office     ? { sales_office: q.sales_office }             : {}),
        ...(q.nco_declared     ? { nco_declared: q.nco_declared }             : {}),
      }
      const result = await listJswStock(params)
      if (id !== fetchIdRef.current) return
      setRows(result.data)
      setMeta(result.meta)
    } catch {
      if (id !== fetchIdRef.current) return
      setError("Failed to load JSW stock data. Please try again.")
    } finally {
      if (id === fetchIdRef.current) setLoading(false)
    }
  }, [])

  // Refetch whenever query object identity changes (also triggered by refetch()).
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void doFetch(query) }, [doFetch, query])

  // ---------------------------------------------------------------------------
  // Param setters — filter/sort/date changes reset page to 1.
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
    (sortBy: JswStockSortBy, sortOrder: "asc" | "desc") =>
      setQuery((q) => ({ ...q, sortBy, sortOrder, page: 1 })),
    [],
  )

  /** Single setter for the 4 per-field filters; resets page to 1. */
  const setFilter = useCallback(
    (patch: Partial<Pick<JswStockQueryState, JswStockField>>) =>
      setQuery((q) => ({ ...q, ...patch, page: 1 })),
    [],
  )

  /** Set the single report-date filter ("dd-MM-yyyy" | null); resets page to 1. */
  const setDate = useCallback(
    (date: string | null) => setQuery((q) => ({ ...q, date, page: 1 })),
    [],
  )

  /** Reset the 4 per-field filters to "" AND the date to null; resets page to 1. */
  const clearFilters = useCallback(() => {
    const cleared = Object.fromEntries(
      FILTER_KEYS.map((k) => [k, ""]),
    ) as Pick<JswStockQueryState, typeof FILTER_KEYS[number]>
    setQuery((q) => ({ ...q, ...cleared, date: null, page: 1 }))
  }, [])

  // Trigger re-fetch without changing params (identity change → useEffect fires).
  const refetch = useCallback(() => setQuery((q) => ({ ...q })), [])

  const openDialog = useCallback((d: JswStockDialogState) => setDialog(d), [])
  const closeDialog = useCallback(() => setDialog({ type: "none" }), [])

  // ---------------------------------------------------------------------------
  // Return value — matches UseJswStockListResult exactly.
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
    error,
    dialog,
    openDialog,
    closeDialog,
    refetch,
  }
}

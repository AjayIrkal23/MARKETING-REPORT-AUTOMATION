/**
 * useJvmlStockList — all state for the JVML Stock List page.
 *
 * Owns query state {page,limit,sortBy,sortOrder,date,4 filters}, server state
 * {rows,meta,loading,error}, dialog discriminated union, and read-only actions
 * (no mutations — JVML Stock is read-only).
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

import { exportJvmlStock } from "@/api/jvml-stock/export"
import { listJvmlStock } from "@/api/jvml-stock/list"
import { loadPersisted, savePersisted } from "@/hooks/usePersistedState"

import type { PaginationMeta } from "@/types/api/envelope"
import type {
  JvmlStock,
  JvmlStockField,
  JvmlStockListQuery,
  JvmlStockSortBy,
} from "@/types/jvml-stock/stock"
import type {
  JvmlStockDialogState,
  JvmlStockQueryState,
  UseJvmlStockListResult,
} from "@/types/jvml-stock/stock-ui"

// ---------------------------------------------------------------------------
// Default query state — sortBy:"created_at", sortOrder:"desc", all filters ""
// ---------------------------------------------------------------------------

const DEFAULT_QUERY: JvmlStockQueryState = {
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
  region: "",
}

// ---------------------------------------------------------------------------
// Filter-key set — used by clearFilters to reset per-field filters only.
// satisfies ensures all 5 values are valid JvmlStockField members.
// ---------------------------------------------------------------------------

const FILTER_KEYS = [
  "party_code",
  "sales_order_type",
  "customer_name",
  "sales_office",
  "nco_declared",
  "region",
] as const satisfies ReadonlyArray<JvmlStockField | "region">

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useJvmlStockList(): UseJvmlStockListResult {
  // Persisted across navigation (localStorage, sliding 1h TTL). The lazy
  // default seeds `date` to today only when nothing fresh is stored — on return
  // within the hour the saved query (date + filters + page + sort) is restored
  // and the refetch effect below repopulates the table with fresh rows.
  const [query, setQuery] = useState<JvmlStockQueryState>(() =>
    loadPersisted("mra:jvml-stock:query", () => ({
      ...DEFAULT_QUERY,
      date: format(new Date(), "dd-MM-yyyy"),
    })),
  )
  const [rows, setRows] = useState<JvmlStock[]>([])
  const [meta, setMeta] = useState<PaginationMeta | null>(null)
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dialog, setDialog] = useState<JvmlStockDialogState>({ type: "none" })

  // Race-safe: discard responses from superseded fetches.
  const fetchIdRef = useRef(0)

  // -------------------------------------------------------------------------
  // doFetch — builds JvmlStockListQuery stripping empty filters + null date.
  // buildQuery in client.ts skips undefined/"" but NOT null — spread only when truthy.
  // -------------------------------------------------------------------------

  const doFetch = useCallback(async (q: JvmlStockQueryState) => {
    const id = ++fetchIdRef.current
    setLoading(true)
    setError(null)
    try {
      const params: JvmlStockListQuery = {
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
        ...(q.region           ? { region: q.region }                         : {}),
      }
      const result = await listJvmlStock(params)
      if (id !== fetchIdRef.current) return
      setRows(result.data)
      setMeta(result.meta)
    } catch {
      if (id !== fetchIdRef.current) return
      setError("Failed to load JVML stock data. Please try again.")
    } finally {
      if (id === fetchIdRef.current) setLoading(false)
    }
  }, [])

  // Refetch whenever query object identity changes (also triggered by refetch()).
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void doFetch(query) }, [doFetch, query])

  // Persist the query so it survives navigation; refreshes the sliding 1h TTL.
  useEffect(() => { savePersisted("mra:jvml-stock:query", query) }, [query])

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
    (sortBy: JvmlStockSortBy, sortOrder: "asc" | "desc") =>
      setQuery((q) => ({ ...q, sortBy, sortOrder, page: 1 })),
    [],
  )

  /** Single setter for per-field filters; resets page to 1. */
  const setFilter = useCallback(
    (patch: Partial<Pick<JvmlStockQueryState, JvmlStockField | "region">>) =>
      setQuery((q) => ({ ...q, ...patch, page: 1 })),
    [],
  )

  /** Set the single report-date filter ("dd-MM-yyyy" | null); resets page to 1. */
  const setDate = useCallback(
    (date: string | null) => setQuery((q) => ({ ...q, date, page: 1 })),
    [],
  )

  /** Reset per-field filters to "" AND the date to null; resets page to 1. */
  const clearFilters = useCallback(() => {
    const cleared = Object.fromEntries(
      FILTER_KEYS.map((k) => [k, ""]),
    ) as Pick<JvmlStockQueryState, typeof FILTER_KEYS[number]>
    setQuery((q) => ({ ...q, ...cleared, date: null, page: 1 }))
  }, [])

  const exportRows = useCallback(
    async (filename?: string) => {
      setExporting(true)
      try {
        const params: JvmlStockListQuery = {
          page: query.page,
          limit: query.limit,
          sortBy: query.sortBy,
          sortOrder: query.sortOrder,
          ...(query.date             ? { date: query.date }                             : {}),
          ...(query.party_code       ? { party_code: query.party_code }                 : {}),
          ...(query.sales_order_type ? { sales_order_type: query.sales_order_type }     : {}),
          ...(query.customer_name    ? { customer_name: query.customer_name }           : {}),
          ...(query.sales_office     ? { sales_office: query.sales_office }             : {}),
          ...(query.nco_declared     ? { nco_declared: query.nco_declared }             : {}),
          ...(query.region           ? { region: query.region }                         : {}),
        }
        await exportJvmlStock(params, filename)
      } finally {
        setExporting(false)
      }
    },
    [query],
  )

  // Trigger re-fetch without changing params (identity change → useEffect fires).
  const refetch = useCallback(() => setQuery((q) => ({ ...q })), [])

  const openDialog = useCallback((d: JvmlStockDialogState) => setDialog(d), [])
  const closeDialog = useCallback(() => setDialog({ type: "none" }), [])

  // ---------------------------------------------------------------------------
  // Return value — matches UseJvmlStockListResult exactly.
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

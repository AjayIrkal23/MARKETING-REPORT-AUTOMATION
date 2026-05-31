/**
 * useAuditLogs — state for the Audit Logs admin page.
 * Contract: SPEC.md §B4
 *
 * Owns query params {page,limit,sortBy,sortOrder,q,category,outcome,method,
 * actor,status,source,dateFrom,dateTo}, server state {rows,meta,loading,error},
 * facets (loaded once on mount), and view-sheet state.
 * ALL filtering/sorting/pagination via API params — no client-side filtering.
 */

import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"

import { listAuditLogs } from "@/api/admin/audit-logs/list"
import { getAuditLog } from "@/api/admin/audit-logs/get"
import { getAuditLogFacets } from "@/api/admin/audit-logs/facets"

import type { PaginationMeta } from "@/types/api/envelope"
import type {
  AuditLog,
  AuditLogDetail,
  AuditLogFacets,
  AuditLogListQuery,
  AuditLogSortBy,
} from "@/types/admin/audit-log"
import type { AuditLogsState } from "@/types/admin/audit-log-ui"

// ---------------------------------------------------------------------------
// Internal view state
// ---------------------------------------------------------------------------

interface ViewState {
  open: boolean
  detail: AuditLogDetail | null
  loading: boolean
}

// ---------------------------------------------------------------------------
// Default query
// ---------------------------------------------------------------------------

const DEFAULT_QUERY: AuditLogListQuery = {
  page: 1,
  limit: 20,
  sortBy: "timestamp",
  sortOrder: "desc",
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useAuditLogs(): AuditLogsState {
  const [query, setQuery] = useState<AuditLogListQuery>(DEFAULT_QUERY)
  const [rows, setRows] = useState<AuditLog[]>([])
  const [meta, setMeta] = useState<PaginationMeta | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [facets, setFacets] = useState<AuditLogFacets | null>(null)
  const [view, setView] = useState<ViewState>({ open: false, detail: null, loading: false })

  // Race-safe: discard responses from superseded fetches.
  const fetchIdRef = useRef(0)

  // -------------------------------------------------------------------------
  // List fetch — re-runs on every query change
  // -------------------------------------------------------------------------

  const doFetch = useCallback(async (q: AuditLogListQuery) => {
    const id = ++fetchIdRef.current
    setLoading(true)
    setError(null)
    try {
      const result = await listAuditLogs(q)
      if (id !== fetchIdRef.current) return
      setRows(result.data)
      setMeta(result.meta)
    } catch {
      if (id !== fetchIdRef.current) return
      const msg = "Failed to load audit logs. Please try again."
      setError(msg)
      toast.error(msg)
    } finally {
      if (id === fetchIdRef.current) setLoading(false)
    }
  }, [])

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void doFetch(query) }, [doFetch, query])

  // -------------------------------------------------------------------------
  // Facets — loaded once on mount, failure is tolerated (→ null)
  // -------------------------------------------------------------------------

  useEffect(() => {
    void getAuditLogFacets()
      .then(setFacets)
      .catch(() => { /* tolerate — toolbar falls back to static enums */ })
  }, [])

  // -------------------------------------------------------------------------
  // View-sheet — load detail by id
  // -------------------------------------------------------------------------

  const openView = useCallback(async (id: string) => {
    setView({ open: true, detail: null, loading: true })
    try {
      const detail = await getAuditLog(id)
      setView({ open: true, detail, loading: false })
    } catch {
      toast.error("Failed to load audit log details.")
      setView({ open: true, detail: null, loading: false })
    }
  }, [])

  const closeView = useCallback(() => {
    setView({ open: false, detail: null, loading: false })
  }, [])

  // -------------------------------------------------------------------------
  // Query setters — all filter/search changes reset page to 1
  // -------------------------------------------------------------------------

  const onQueryChange = useCallback((patch: Partial<AuditLogListQuery>) => {
    setQuery((q) => ({
      ...q,
      ...patch,
      // reset page unless the caller explicitly sets it
      page: patch.page !== undefined ? patch.page : 1,
    }))
  }, [])

  const onSort = useCallback((col: AuditLogSortBy) => {
    setQuery((q) => ({
      ...q,
      sortBy: col,
      sortOrder: q.sortBy === col && q.sortOrder === "desc" ? "asc" : "desc",
      page: 1,
    }))
  }, [])

  const onPageChange = useCallback((page: number) => {
    setQuery((q) => ({ ...q, page }))
  }, [])

  const onLimitChange = useCallback((limit: number) => {
    setQuery((q) => ({ ...q, limit, page: 1 }))
  }, [])

  // -------------------------------------------------------------------------
  // Return
  // -------------------------------------------------------------------------

  return {
    query,
    rows,
    meta,
    loading,
    error,
    facets,
    view,
    openView,
    closeView,
    onQueryChange,
    onSort,
    onPageChange,
    onLimitChange,
  }
}

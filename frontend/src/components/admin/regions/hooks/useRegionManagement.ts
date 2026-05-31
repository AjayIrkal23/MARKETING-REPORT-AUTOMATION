/**
 * useRegionManagement — all state for the Region Management page.
 *
 * Owns query params {page,limit,sortBy,sortOrder,q,active},
 * server state {rows,meta,loading,error}, dialog discriminated union, and
 * mutation actions (remove + toggleActive via useRegionMutations).
 *
 * ALL filtering / sorting / pagination is server-driven via API params.
 * fetchIdRef guards against stale responses from superseded fetches.
 * Filter/sort/search setters reset page to 1 automatically.
 *
 * Contract: .planning/regions/ADDENDUM.md §hooks/useRegionManagement.ts
 */

import { useCallback, useEffect, useRef, useState } from "react"

import { listRegions } from "@/api/admin/regions/list"
import { useRegionMutations } from "./useRegionMutations"

import type { PaginationMeta } from "@/types/api/envelope"
import type { Region, RegionSortBy, RegionListQuery } from "@/types/admin/region"
import type {
  RegionDialogState,
  RegionQueryState,
  UseRegionManagementResult,
} from "@/types/admin/region-ui"

// ---------------------------------------------------------------------------
// Default query state
// ---------------------------------------------------------------------------

const DEFAULT_QUERY: RegionQueryState = {
  page: 1,
  limit: 20,
  sortBy: "created_at",
  sortOrder: "desc",
  q: "",
  active: "all",
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useRegionManagement(): UseRegionManagementResult {
  const [query, setQuery] = useState<RegionQueryState>(DEFAULT_QUERY)
  const [rows, setRows] = useState<Region[]>([])
  const [meta, setMeta] = useState<PaginationMeta | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dialog, setDialog] = useState<RegionDialogState>({ type: "none" })

  // Race-safe: discard responses from superseded fetches.
  const fetchIdRef = useRef(0)

  const doFetch = useCallback(async (q: RegionQueryState) => {
    const id = ++fetchIdRef.current
    setLoading(true)
    setError(null)
    try {
      const params: RegionListQuery = {
        page: q.page,
        limit: q.limit,
        sortBy: q.sortBy,
        sortOrder: q.sortOrder,
        ...(q.q ? { q: q.q } : {}),
        ...(q.active !== "all" ? { active: q.active } : {}),
      }
      const result = await listRegions(params)
      if (id !== fetchIdRef.current) return
      setRows(result.data)
      setMeta(result.meta)
    } catch {
      if (id !== fetchIdRef.current) return
      setError("Failed to load regions. Please try again.")
    } finally {
      if (id === fetchIdRef.current) setLoading(false)
    }
  }, [])

  // Refetch whenever query object identity changes (also triggered by refetch()).
  // Data-fetch effect: setState happens inside the async doFetch (loading/rows/error),
  // which the rule flags as a false positive.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void doFetch(query) }, [doFetch, query])

  // ---------------------------------------------------------------------------
  // Param setters — filter/sort/search changes reset page to 1.
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
    (sortBy: RegionSortBy, sortOrder: "asc" | "desc") =>
      setQuery((q) => ({ ...q, sortBy, sortOrder, page: 1 })),
    [],
  )

  const setSearch = useCallback(
    (s: string) => setQuery((q) => ({ ...q, q: s, page: 1 })),
    [],
  )

  const setActive = useCallback(
    (active: boolean | "all") => setQuery((q) => ({ ...q, active, page: 1 })),
    [],
  )

  // Trigger a re-fetch without changing params (object identity change → useEffect fires).
  const refetch = useCallback(() => setQuery((q) => ({ ...q })), [])

  const openDialog = useCallback((d: RegionDialogState) => setDialog(d), [])
  const closeDialog = useCallback(() => setDialog({ type: "none" }), [])

  // ---------------------------------------------------------------------------
  // Mutations — delegated to useRegionMutations for separation of concerns.
  // ---------------------------------------------------------------------------

  const mutations = useRegionMutations({ closeDialog, refetch })

  // ---------------------------------------------------------------------------
  // Return value — matches UseRegionManagementResult exactly.
  // ---------------------------------------------------------------------------

  return {
    query,
    setPage,
    setLimit,
    setSort,
    setSearch,
    setActive,
    rows,
    meta,
    loading,
    error,
    dialog,
    openDialog,
    closeDialog,
    actions: { refetch, ...mutations },
  }
}

/**
 * useCustomerCodeManagement — all state for the Customer Code Management page.
 *
 * Owns query params {page,limit,sortBy,sortOrder,q,segment,code,customer,
 * destination,cam,mob,region},
 * server state {rows,meta,loading,error}, dialog discriminated union, and
 * mutation actions (remove via useCustomerCodeMutations).
 *
 * ALL filtering / sorting / pagination is server-driven via API params.
 * fetchIdRef guards against stale responses from superseded fetches.
 * Filter/sort/search setters reset page to 1 automatically.
 * setFilter is a single setter for all per-field filters (including region)
 * — no 11 individual setters (ADDENDUM Area 9 BLOCKER-4).
 *
 * Contract: .planning/customer-codes/SPEC.md §4.3 + ADDENDUM §Area 9.
 */

import { useCallback, useEffect, useRef, useState } from "react"

import { listCustomerCodes } from "@/api/admin/customer-codes/list"
import { useCustomerCodeMutations } from "./useCustomerCodeMutations"

import type { PaginationMeta } from "@/types/api/envelope"
import type { CustomerCode, CustomerCodeListQuery, CustomerCodeSortBy } from "@/types/admin/customer-code"
import type {
  CustomerCodeDialogState,
  CustomerCodeQueryState,
  UseCustomerCodeManagementResult,
} from "@/types/admin/customer-code-ui"

// ---------------------------------------------------------------------------
// Default query state
// ---------------------------------------------------------------------------

const DEFAULT_QUERY: CustomerCodeQueryState = {
  page: 1,
  limit: 20,
  sortBy: "created_at",
  sortOrder: "desc",
  q: "",
  segment: "",
  code: "",
  customer: "",
  destination: "",
  cam: "",
  mob: "",
  region: "",
}

// ---------------------------------------------------------------------------
// Filter-key set — used by clearFilters to reset per-field filters only.
// ---------------------------------------------------------------------------

const FILTER_KEYS = [
  "segment", "code", "customer", "destination",
  "cam", "mob", "region",
] as const satisfies ReadonlyArray<keyof CustomerCodeQueryState>

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useCustomerCodeManagement(): UseCustomerCodeManagementResult {
  const [query, setQuery] = useState<CustomerCodeQueryState>(DEFAULT_QUERY)
  const [rows, setRows] = useState<CustomerCode[]>([])
  const [meta, setMeta] = useState<PaginationMeta | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dialog, setDialog] = useState<CustomerCodeDialogState>({ type: "none" })

  // Race-safe: discard responses from superseded fetches.
  const fetchIdRef = useRef(0)

  const doFetch = useCallback(async (q: CustomerCodeQueryState) => {
    const id = ++fetchIdRef.current
    setLoading(true)
    setError(null)
    try {
      // Strip empty strings before forwarding to the API — backend rejects
      // unknown query keys and treats empty strings as active filters.
      const params: CustomerCodeListQuery = {
        page: q.page,
        limit: q.limit,
        sortBy: q.sortBy,
        sortOrder: q.sortOrder,
        ...(q.q ? { q: q.q } : {}),
        ...(q.segment ? { segment: q.segment } : {}),
        ...(q.code ? { code: q.code } : {}),
        ...(q.customer ? { customer: q.customer } : {}),
        ...(q.destination ? { destination: q.destination } : {}),
        ...(q.cam ? { cam: q.cam } : {}),
        ...(q.mob ? { mob: q.mob } : {}),
        // Region FK: query key is "region" (NOT "region_id") per ADDENDUM Area 8 BLOCKER 3
        ...(q.region ? { region: q.region } : {}),
      }
      const result = await listCustomerCodes(params)
      if (id !== fetchIdRef.current) return
      setRows(result.data)
      setMeta(result.meta)
    } catch {
      if (id !== fetchIdRef.current) return
      setError("Failed to load customer codes. Please try again.")
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
    (sortBy: CustomerCodeSortBy, sortOrder: "asc" | "desc") =>
      setQuery((q) => ({ ...q, sortBy, sortOrder, page: 1 })),
    [],
  )

  const setSearch = useCallback(
    (s: string) => setQuery((q) => ({ ...q, q: s, page: 1 })),
    [],
  )

  /**
   * Single setter for all per-field filters (segment, code, customer, destination,
   * cam, mob, region).
   * Resets page to 1 on every call — no individual setters (ADDENDUM Area 9 BLOCKER-4).
   */
  const setFilter = useCallback(
    (
      patch: Partial<
        Pick<
          CustomerCodeQueryState,
          | "segment"
          | "code"
          | "customer"
          | "destination"
          | "cam"
          | "mob"
          | "region"
        >
      >,
    ) => setQuery((q) => ({ ...q, ...patch, page: 1 })),
    [],
  )

  /** Reset all per-field filters and region to empty string; reset page to 1. */
  const clearFilters = useCallback(() => {
    const cleared = Object.fromEntries(FILTER_KEYS.map((k) => [k, ""])) as Pick<
      CustomerCodeQueryState,
      typeof FILTER_KEYS[number]
    >
    setQuery((q) => ({ ...q, ...cleared, page: 1 }))
  }, [])

  // Trigger a re-fetch without changing params (object identity change → useEffect fires).
  const refetch = useCallback(() => setQuery((q) => ({ ...q })), [])

  const openDialog = useCallback((d: CustomerCodeDialogState) => setDialog(d), [])
  const closeDialog = useCallback(() => setDialog({ type: "none" }), [])

  // ---------------------------------------------------------------------------
  // Mutations — delegated to useCustomerCodeMutations for separation of concerns.
  // Import mutation is NOT here — ImportCustomerCodesDialog owns its own async
  // state and calls onImported() (wired to refetch()) on success (ADDENDUM Area 9 BLOCKER-3).
  // ---------------------------------------------------------------------------

  const mutations = useCustomerCodeMutations({ closeDialog, refetch })

  // ---------------------------------------------------------------------------
  // Return value — matches UseCustomerCodeManagementResult exactly.
  // ---------------------------------------------------------------------------

  return {
    query,
    setPage,
    setLimit,
    setSort,
    setSearch,
    setFilter,
    clearFilters,
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

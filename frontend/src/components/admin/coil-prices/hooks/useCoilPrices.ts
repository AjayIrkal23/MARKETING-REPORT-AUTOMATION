/**
 * useCoilPrices — server state for the Per Coil Price section.
 *
 * Fetches the full coil-price list (sorted by quantity asc, limit 100) for the
 * compact section, and owns the delete mutation. ALL sorting/filtering is
 * server-driven. fetchIdRef guards against stale responses; reloadKey forces a
 * refetch on demand and after a successful delete.
 */

import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"

import { listCoilPrices } from "@/api/admin/coil-prices/list"
import { removeCoilPrice } from "@/api/admin/coil-prices/remove"
import type { CoilPrice } from "@/types/admin/coil-price"

export interface UseCoilPricesResult {
  rows: CoilPrice[]
  loading: boolean
  error: string | null
  removing: boolean
  refetch: () => void
  remove: (id: string) => Promise<void>
}

export function useCoilPrices(): UseCoilPricesResult {
  const [rows, setRows] = useState<CoilPrice[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [removing, setRemoving] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  // Race-safe: discard responses from superseded fetches.
  const fetchIdRef = useRef(0)

  const doFetch = useCallback(async () => {
    const id = ++fetchIdRef.current
    setLoading(true)
    setError(null)
    try {
      const result = await listCoilPrices({ sortBy: "quantity", sortOrder: "asc", limit: 100 })
      if (id !== fetchIdRef.current) return
      setRows(result.data)
    } catch {
      if (id !== fetchIdRef.current) return
      setError("Failed to load coil prices. Please try again.")
    } finally {
      if (id === fetchIdRef.current) setLoading(false)
    }
  }, [])

  // Data-fetch effect: setState happens inside the async doFetch, which the
  // rule flags as a false positive.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void doFetch() }, [doFetch, reloadKey])

  const refetch = useCallback(() => setReloadKey((k) => k + 1), [])

  const remove = useCallback(async (id: string) => {
    setRemoving(true)
    try {
      await removeCoilPrice(id)
      toast.success("Coil price deleted.")
      setReloadKey((k) => k + 1)
    } catch (err) {
      toast.error(err instanceof Error ? (err.message || "Failed to delete coil price.") : "Failed to delete coil price.")
    } finally {
      setRemoving(false)
    }
  }, [])

  return { rows, loading, error, removing, refetch, remove }
}

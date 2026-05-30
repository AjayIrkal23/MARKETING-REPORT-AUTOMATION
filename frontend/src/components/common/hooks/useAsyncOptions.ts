import { useState, useEffect, useRef, useCallback } from "react"

import type { AsyncOption } from "@/types/admin/options"

export interface UseAsyncOptionsState {
  query: string
  setQuery: (q: string) => void
  options: AsyncOption[]
  loading: boolean
  error: string | null
}

/**
 * Manages debounced, race-safe backend option fetching for async comboboxes.
 *
 * - Debounce: 300 ms after the last keystroke before firing the request.
 * - Race safety: stale in-flight responses are silently discarded via an
 *   AbortController; only the response matching the latest query is applied.
 * - On mount, fetches with an empty query to pre-populate the list.
 *
 * Contract: USER-MANAGEMENT-PLAN.md §4.6
 * `components/common/hooks/useAsyncOptions.ts`
 */
export function useAsyncOptions(
  fetchOptions: (q: string) => Promise<AsyncOption[]>,
  debounceMs = 300,
): UseAsyncOptionsState {
  const [query, setQuery] = useState("")
  const [options, setOptions] = useState<AsyncOption[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Stable ref so the effect closure always calls the latest fetchOptions.
  const fetchRef = useRef(fetchOptions)
  useEffect(() => {
    fetchRef.current = fetchOptions
  }, [fetchOptions])

  const abortRef = useRef<AbortController | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const runFetch = useCallback((q: string) => {
    // Cancel previous in-flight request.
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setLoading(true)
    setError(null)

    fetchRef
      .current(q)
      .then((results) => {
        if (controller.signal.aborted) return
        setOptions(results)
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return
        setError(err instanceof Error ? err.message : "Failed to load options")
        setOptions([])
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
  }, [])

  useEffect(() => {
    if (timerRef.current !== null) clearTimeout(timerRef.current)

    timerRef.current = setTimeout(() => {
      runFetch(query)
    }, debounceMs)

    return () => {
      if (timerRef.current !== null) clearTimeout(timerRef.current)
    }
  }, [query, debounceMs, runFetch])

  // Abort on unmount.
  useEffect(() => {
    return () => {
      abortRef.current?.abort()
    }
  }, [])

  return { query, setQuery, options, loading, error }
}

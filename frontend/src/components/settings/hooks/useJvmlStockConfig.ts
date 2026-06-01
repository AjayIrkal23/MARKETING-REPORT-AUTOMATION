/**
 * useJvmlStockConfig — loads singleton config + status on mount, exposes save()
 * and runNow() with sonner toast feedback.
 *
 * Owns:
 *   - config / status state (loaded in parallel on mount)
 *   - isLoading / isSaving / isRunning / error flags
 *   - save(input) — PUT config, refresh status, toast
 *   - runNow()    — POST run-now, refresh status, toast
 *   - refetch     — re-run the parallel load (callable externally)
 *
 * Race-safety: fetchIdRef prevents stale responses from overwriting newer ones
 * if the component unmounts mid-flight or load() is called twice in quick
 * succession.
 *
 * SPEC: .planning/jvml-stock/SPEC.md §3 hooks/useJvmlStockConfig.ts
 * ADDENDUM: A-FE FE-9 (card owns hook, no props); area note §2 (skeleton verbatim).
 */
import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"

import { getJvmlStockConfig } from "@/api/settings/jvml-stock-config/get"
import { updateJvmlStockConfig } from "@/api/settings/jvml-stock-config/update"
import { getJvmlStockStatus } from "@/api/settings/jvml-stock-config/status"
import { runJvmlStockCheckNow } from "@/api/settings/jvml-stock-config/runNow"
import type {
  JvmlStockConfig,
  JvmlStockConfigInput,
  JvmlStockStatus,
} from "@/types/settings/jvml-stock-config"
import type { UseJvmlStockConfigResult } from "@/types/settings/jvml-stock-config-ui"

export function useJvmlStockConfig(): UseJvmlStockConfigResult {
  const [config, setConfig] = useState<JvmlStockConfig | null>(null)
  const [status, setStatus] = useState<JvmlStockStatus | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isRunning, setIsRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Race-safe: ignore stale responses if load() is re-entered or component unmounts.
  const fetchIdRef = useRef(0)

  // -------------------------------------------------------------------------
  // load — fetches config + status in parallel; race-guarded via fetchIdRef
  // -------------------------------------------------------------------------

  const load = useCallback(async () => {
    const id = ++fetchIdRef.current
    setIsLoading(true)
    setError(null)
    try {
      const [cfg, stat] = await Promise.all([
        getJvmlStockConfig(),
        getJvmlStockStatus(),
      ])
      if (fetchIdRef.current !== id) return
      setConfig(cfg)
      setStatus(stat)
    } catch (err) {
      if (fetchIdRef.current !== id) return
      setError(
        err instanceof Error ? err.message : "Failed to load configuration.",
      )
    } finally {
      if (fetchIdRef.current === id) setIsLoading(false)
    }
  }, [])

  // Run on mount — load() sets state asynchronously (data-fetch effect).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load()
  }, [load])

  // -------------------------------------------------------------------------
  // save — PUT config, then refresh status to reflect any schedule change
  // -------------------------------------------------------------------------

  const save = useCallback(
    async (input: JvmlStockConfigInput) => {
      setIsSaving(true)
      setError(null)
      try {
        const updated = await updateJvmlStockConfig(input)
        setConfig(updated)
        // Refresh status — the save may have toggled the scheduler on/off.
        const stat = await getJvmlStockStatus()
        setStatus(stat)
        toast.success("Configuration saved.")
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Failed to save configuration."
        setError(msg)
        toast.error(msg)
      } finally {
        setIsSaving(false)
      }
    },
    [],
  )

  // -------------------------------------------------------------------------
  // runNow — POST run-now, then refresh status to show updated last-run info
  // -------------------------------------------------------------------------

  const runNow = useCallback(async () => {
    setIsRunning(true)
    setError(null)
    try {
      const stat = await runJvmlStockCheckNow()
      setStatus(stat)
      toast.success("Check triggered — status updated.")
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to trigger check."
      setError(msg)
      toast.error(msg)
    } finally {
      setIsRunning(false)
    }
  }, [])

  // -------------------------------------------------------------------------
  // Return
  // -------------------------------------------------------------------------

  return {
    config,
    status,
    isLoading,
    isSaving,
    isRunning,
    error,
    save,
    runNow,
    refetch: load,
  }
}

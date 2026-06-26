/**
 * useCleanupConfig — loads the cleanup policy singleton on mount, exposes
 * save() and runNow() with sonner toast feedback.
 *
 * Simpler than the stock config hooks: there is no separate status endpoint —
 * last-run info lives on the config doc itself (refreshed by save/runNow).
 * Race-safety: fetchIdRef ignores stale responses from overlapping loads.
 */
import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"

import { getCleanupConfig } from "@/api/settings/cleanup-config/get"
import { updateCleanupConfig } from "@/api/settings/cleanup-config/update"
import { runCleanupNow } from "@/api/settings/cleanup-config/runNow"
import type { CleanupConfig, CleanupConfigInput } from "@/types/settings/cleanup-config"
import type { UseCleanupConfigResult } from "@/types/settings/cleanup-config-ui"

export function useCleanupConfig(): UseCleanupConfigResult {
  const [config, setConfig] = useState<CleanupConfig | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isRunning, setIsRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchIdRef = useRef(0)

  const load = useCallback(async () => {
    const id = ++fetchIdRef.current
    setIsLoading(true)
    setError(null)
    try {
      const cfg = await getCleanupConfig()
      if (fetchIdRef.current !== id) return
      setConfig(cfg)
    } catch (err) {
      if (fetchIdRef.current !== id) return
      setError(err instanceof Error ? err.message : "Failed to load configuration.")
    } finally {
      if (fetchIdRef.current === id) setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load()
  }, [load])

  const save = useCallback(async (input: CleanupConfigInput) => {
    setIsSaving(true)
    setError(null)
    try {
      setConfig(await updateCleanupConfig(input))
      toast.success("Configuration saved.")
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to save configuration."
      setError(msg)
      toast.error(msg)
    } finally {
      setIsSaving(false)
    }
  }, [])

  const runNow = useCallback(async () => {
    setIsRunning(true)
    setError(null)
    try {
      const updated = await runCleanupNow()
      setConfig(updated)
      toast.success(
        updated.enabled
          ? `Cleanup ran — ${updated.last_deleted_count} folder(s) deleted.`
          : "Cleanup is disabled — nothing was deleted.",
      )
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to trigger cleanup."
      setError(msg)
      toast.error(msg)
    } finally {
      setIsRunning(false)
    }
  }, [])

  return { config, isLoading, isSaving, isRunning, error, save, runNow, refetch: load }
}

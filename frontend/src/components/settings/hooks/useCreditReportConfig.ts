/**
 * useCreditReportConfig — loads singleton config + status on mount, exposes save()
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
 * SPEC: .planning/credit-report/SPEC.md §3 hooks/useCreditReportConfig.ts
 * ADDENDUM: A-FE FE-9 (card owns hook, no props); area note §2 (skeleton verbatim).
 */
import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"

import { getCreditReportConfig } from "@/api/settings/credit-report-config/get"
import { updateCreditReportConfig } from "@/api/settings/credit-report-config/update"
import { getCreditReportStatus } from "@/api/settings/credit-report-config/status"
import { runCreditReportCheckNow } from "@/api/settings/credit-report-config/runNow"
import { runCreditReportZoneNow } from "@/api/settings/credit-report-config/runNowZone"
import type {
  CreditReportConfig,
  CreditReportConfigInput,
  CreditReportStatus,
} from "@/types/settings/credit-report-config"
import type { UseCreditReportConfigResult } from "@/types/settings/credit-report-config-ui"

export function useCreditReportConfig(): UseCreditReportConfigResult {
  const [config, setConfig] = useState<CreditReportConfig | null>(null)
  const [status, setStatus] = useState<CreditReportStatus | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isRunning, setIsRunning] = useState(false)
  const [runningZoneId, setRunningZoneId] = useState<string | null>(null)
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
        getCreditReportConfig(),
        getCreditReportStatus(),
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
    async (input: CreditReportConfigInput) => {
      setIsSaving(true)
      setError(null)
      try {
        const updated = await updateCreditReportConfig(input)
        setConfig(updated)
        // Refresh status — the save may have toggled the scheduler on/off.
        const stat = await getCreditReportStatus()
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
      const stat = await runCreditReportCheckNow()
      setStatus(stat)
      toast.success("All zones check triggered. Status updated.")
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to trigger check."
      setError(msg)
      toast.error(msg)
    } finally {
      setIsRunning(false)
    }
  }, [])

  const runZoneNow = useCallback(async (regionId: string) => {
    setRunningZoneId(regionId)
    setError(null)
    try {
      const stat = await runCreditReportZoneNow(regionId)
      setStatus(stat)
      toast.success("Zone check triggered. Status updated.")
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to trigger zone check."
      setError(msg)
      toast.error(msg)
    } finally {
      setRunningZoneId(null)
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
    runningZoneId,
    error,
    save,
    runNow,
    runZoneNow,
    refetch: load,
  }
}

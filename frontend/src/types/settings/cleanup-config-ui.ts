/**
 * Settings — UI controller contract for the cleanup config card.
 *
 * Returned by `useCleanupConfig()` and consumed by `<CleanupConfigCard>`.
 */
import type { CleanupConfig, CleanupConfigInput } from "./cleanup-config"

export interface UseCleanupConfigResult {
  config: CleanupConfig | null
  isLoading: boolean
  isSaving: boolean
  isRunning: boolean
  error: string | null
  /** PUT the config, then refresh local state + toast. */
  save: (input: CleanupConfigInput) => Promise<void>
  /** POST run-now (respects `enabled`), then refresh local state + toast. */
  runNow: () => Promise<void>
  /** Re-fetch the config singleton. */
  refetch: () => Promise<void>
}

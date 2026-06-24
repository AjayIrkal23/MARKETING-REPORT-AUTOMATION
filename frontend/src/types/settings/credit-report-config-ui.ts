/**
 * Settings — Credit Report config hook return contract.
 *
 * `CreditReportConfigCard` takes NO props (FE-9: it owns `useCreditReportConfig()`
 * internally) and renders the shared `<StockConfigPanel>`. The live status is
 * rendered by the shared `<StockLastRun>` from the same hook data, so
 * no per-domain status-prop contract is needed here.
 *
 * SPEC: .planning/credit-report/SPEC.md §3 types/settings/credit-report-config-ui.ts
 * ADDENDUM A-FE: FE-9 (card is prop-less).
 */

import type {
  CreditReportConfig,
  CreditReportConfigInput,
  CreditReportStatus,
} from "./credit-report-config"

// ---------------------------------------------------------------------------
// useCreditReportConfig hook return contract
// ---------------------------------------------------------------------------

/**
 * Return type of `useCreditReportConfig` — used internally by `CreditReportConfigCard`.
 *
 * The hook owns config loading, status loading, form submission (save), and
 * the manual "run now" trigger. Toasts on success/failure via sonner.
 */
export interface UseCreditReportConfigResult {
  /** Current config from the server, or null while loading for the first time. */
  config: CreditReportConfig | null
  /** Current status from the server, or null while loading for the first time. */
  status: CreditReportStatus | null
  /**
   * True while the initial config + status fetch (or a refetch) is in-flight.
   * The card disables all form controls and shows status skeletons while true.
   */
  isLoading: boolean
  /**
   * True while the PUT /admin/credit-report/config request is in-flight.
   * The "Save configuration" button shows a spinner and is disabled while true.
   */
  isSaving: boolean
  /**
   * True while the POST /admin/credit-report/run-now request is in-flight.
   * The "Run check now" button shows a spinner and is disabled while true.
   */
  isRunning: boolean
  runningZoneId: string | null
  /**
   * The last error message from a failed load, save, or run-now call,
   * or null when no error is present. Cleared on the next operation start.
   */
  error: string | null
  /**
   * Submit the config form. Validates client-side before calling the API.
   * On success: updates `config`, refreshes `status`, shows success toast.
   * On failure: sets `error`, shows error toast.
   */
  save: (input: CreditReportConfigInput) => Promise<void>
  /**
   * Trigger an immediate poll via POST /admin/credit-report/run-now.
   * On completion (success or error): refreshes `status`.
   */
  runNow: () => Promise<void>
  /** Trigger one region-zone poll via POST /admin/credit-report/run-now/{regionId}. */
  runZoneNow: (regionId: string) => Promise<void>
  /**
   * Re-run the initial load (GET config + GET status in parallel).
   * Called after save/runNow to ensure the UI reflects the latest server state.
   */
  refetch: () => void
}

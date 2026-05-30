/**
 * Async select / backend-driven option contracts.
 *
 * Used by `AsyncCombobox` and the `searchUserOptions` API module.
 * Contract source: USER-MANAGEMENT-PLAN.md §4.2 (`types/admin/options.ts`).
 */

/**
 * A single option item returned by `/admin/users/options`.
 * Mirrors backend `AsyncOption` schema.
 */
export interface AsyncOption {
  value: string
  label: string
  /** Optional secondary line shown beneath the label in the dropdown. */
  sublabel?: string
}

/** Query params for `GET /admin/users/options`. Backend limit: 1–200, default 50. */
export interface OptionsQuery {
  /** Case-insensitive server-side search over name + email. */
  q?: string
  /** Max results to return (backend clamps to ≤200). */
  limit?: number
}

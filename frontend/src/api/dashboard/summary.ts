/**
 * `GET /dashboard/summary` — today's per-report ingestion status.
 *
 * Backs the three dashboard status cards (JSW Stock / JVML Stock / Credit
 * Report). Read-only, non-admin (any authenticated user). Goes through the
 * shared `getData` client so the standard envelope is unwrapped centrally.
 */

import { getData } from "@/api/client"
import type { DashboardSummary } from "@/types/dashboard/summary"

/** Fetch today's ingestion summary for all three report domains. */
export function getDashboardSummary(): Promise<DashboardSummary> {
  return getData<DashboardSummary>("/dashboard/summary")
}

/** `GET /admin/audit-logs/options` — backend-driven async option search (≤200 results). */

import { buildQuery, getData } from "@/api/client"
import type { AsyncOption } from "@/types/admin/options"

export function searchAuditLogOptions(
  params: { q?: string; limit?: number } = {},
): Promise<AsyncOption[]> {
  return getData<AsyncOption[]>(
    `/admin/audit-logs/options${buildQuery({ q: params.q, limit: params.limit ?? 50 })}`,
  )
}

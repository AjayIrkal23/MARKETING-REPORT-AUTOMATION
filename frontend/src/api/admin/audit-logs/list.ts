/** `GET /admin/audit-logs` — backend-driven paginated audit log list. */

import { buildQuery, getList } from "@/api/client"
import type { PaginatedResult } from "@/types/api/envelope"
import type { AuditLog, AuditLogListQuery } from "@/types/admin/audit-log"

/**
 * Drop "all" sentinel values before sending to the backend — the backend
 * does not understand "all" and treats an absent parameter as "no filter".
 */
function normalize(
  q: AuditLogListQuery,
): Record<string, string | number | undefined> {
  const strip = (v: unknown): string | number | undefined =>
    v === "all" ? undefined : (v as string | number | undefined)

  return {
    page: q.page,
    limit: q.limit,
    sortBy: q.sortBy,
    sortOrder: q.sortOrder,
    q: q.q,
    category: strip(q.category),
    outcome: strip(q.outcome),
    method: strip(q.method),
    actor: q.actor,
    status: q.status,
    action: strip(q.action),
    source: strip(q.source),
    dateFrom: q.dateFrom,
    dateTo: q.dateTo,
  }
}

export function listAuditLogs(
  query: AuditLogListQuery = {},
): Promise<PaginatedResult<AuditLog>> {
  return getList<AuditLog>(`/admin/audit-logs${buildQuery(normalize(query))}`)
}

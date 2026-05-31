/** `GET /admin/audit-logs/:id` — fetch a single audit log entry by id. */

import { getData } from "@/api/client"
import type { AuditLogDetail } from "@/types/admin/audit-log"

export function getAuditLog(id: string): Promise<AuditLogDetail> {
  return getData<AuditLogDetail>(`/admin/audit-logs/${id}`)
}

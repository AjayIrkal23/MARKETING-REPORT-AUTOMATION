/** `GET /admin/audit-logs/facets` — static filter facet enums (categories, outcomes, sources, methods). */

import { getData } from "@/api/client"
import type { AuditLogFacets } from "@/types/admin/audit-log"

export function getAuditLogFacets(): Promise<AuditLogFacets> {
  return getData<AuditLogFacets>("/admin/audit-logs/facets")
}

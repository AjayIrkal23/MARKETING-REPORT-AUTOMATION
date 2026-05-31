/** `GET /admin/regions` — backend-driven paginated region list. */

import { buildQuery, getList } from "@/api/client"
import type { PaginatedResult } from "@/types/api/envelope"
import type { Region, RegionListQuery } from "@/types/admin/region"

/**
 * Drop "all" sentinel and convert boolean active to string —
 * buildQuery does not accept raw booleans.
 */
function normalize(q: RegionListQuery): Record<string, string | number | undefined> {
  return {
    page: q.page,
    limit: q.limit,
    sortBy: q.sortBy,
    sortOrder: q.sortOrder,
    q: q.q,
    active:
      q.active === "all" ? undefined
      : q.active === true ? "true"
      : q.active === false ? "false"
      : undefined,
  }
}

export function listRegions(query: RegionListQuery = {}): Promise<PaginatedResult<Region>> {
  return getList<Region>(`/admin/regions${buildQuery(normalize(query))}`)
}

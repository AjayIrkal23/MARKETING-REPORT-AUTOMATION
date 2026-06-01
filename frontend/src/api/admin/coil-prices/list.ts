/** `GET /admin/coil-prices` — backend-driven paginated coil price list. */

import { buildQuery, getList } from "@/api/client"
import type { PaginatedResult } from "@/types/api/envelope"
import type { CoilPrice, CoilPriceListQuery } from "@/types/admin/coil-price"

/**
 * Drop "all" sentinel and convert boolean active to string —
 * buildQuery does not accept raw booleans.
 */
function normalize(q: CoilPriceListQuery): Record<string, string | number | undefined> {
  return {
    page: q.page,
    limit: q.limit,
    sortBy: q.sortBy,
    sortOrder: q.sortOrder,
    active:
      q.active === "all" ? undefined
      : q.active === true ? "true"
      : q.active === false ? "false"
      : undefined,
  }
}

export function listCoilPrices(query: CoilPriceListQuery = {}): Promise<PaginatedResult<CoilPrice>> {
  return getList<CoilPrice>(`/admin/coil-prices${buildQuery(normalize(query))}`)
}

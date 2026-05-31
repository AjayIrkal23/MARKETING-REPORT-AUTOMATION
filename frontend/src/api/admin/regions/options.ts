/** `GET /admin/regions/options` — backend-driven async option search (≤50 results). */

import { buildQuery, getData } from "@/api/client"
import type { AsyncOption } from "@/types/admin/options"

export function searchRegionOptions(q: string): Promise<AsyncOption[]> {
  return getData<AsyncOption[]>(
    `/admin/regions/options${buildQuery({ q, limit: 20 })}`,
  )
}

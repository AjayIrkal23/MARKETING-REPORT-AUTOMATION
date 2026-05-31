/** `PATCH /admin/regions/{id}` — update mutable fields (name, emails, active). */

import { patchData } from "@/api/client"
import type { Region, UpdateRegionInput } from "@/types/admin/region"

export function updateRegion(id: string, input: UpdateRegionInput): Promise<Region> {
  return patchData<Region>(`/admin/regions/${id}`, input)
}

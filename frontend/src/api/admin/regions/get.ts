/** `GET /admin/regions/{id}` — fetch a single region by ID. */

import { getData } from "@/api/client"
import type { Region } from "@/types/admin/region"

export function getRegion(id: string): Promise<Region> {
  return getData<Region>(`/admin/regions/${id}`)
}

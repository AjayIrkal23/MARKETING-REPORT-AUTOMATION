/** `POST /admin/regions` — create a new region. */

import { postData } from "@/api/client"
import type { Region, CreateRegionInput } from "@/types/admin/region"

export function createRegion(input: CreateRegionInput): Promise<Region> {
  return postData<Region>("/admin/regions", input)
}

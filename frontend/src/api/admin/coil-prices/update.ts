/** `PATCH /admin/coil-prices/{id}` — update mutable fields (quantity, price, active). */

import { patchData } from "@/api/client"
import type { CoilPrice, UpdateCoilPriceInput } from "@/types/admin/coil-price"

export function updateCoilPrice(id: string, input: UpdateCoilPriceInput): Promise<CoilPrice> {
  return patchData<CoilPrice>(`/admin/coil-prices/${id}`, input)
}

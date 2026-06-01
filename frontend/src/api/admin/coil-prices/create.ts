/** `POST /admin/coil-prices` — create a new coil price. */

import { postData } from "@/api/client"
import type { CoilPrice, CreateCoilPriceInput } from "@/types/admin/coil-price"

export function createCoilPrice(input: CreateCoilPriceInput): Promise<CoilPrice> {
  return postData<CoilPrice>("/admin/coil-prices", input)
}

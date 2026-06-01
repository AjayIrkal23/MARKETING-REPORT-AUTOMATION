/** `DELETE /admin/coil-prices/{id}` — permanently remove a coil price. */

import { deleteData } from "@/api/client"

export function removeCoilPrice(id: string): Promise<null> {
  return deleteData<null>(`/admin/coil-prices/${id}`)
}

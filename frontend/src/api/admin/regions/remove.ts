/** `DELETE /admin/regions/{id}` — permanently remove a region. */

import { deleteData } from "@/api/client"

export function removeRegion(id: string): Promise<null> {
  return deleteData<null>(`/admin/regions/${id}`)
}

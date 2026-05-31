/** `DELETE /admin/customer-codes/{id}` — permanently remove a customer code record. */

import { deleteData } from "@/api/client"

export function removeCustomerCode(id: string): Promise<null> {
  return deleteData<null>(`/admin/customer-codes/${id}`)
}

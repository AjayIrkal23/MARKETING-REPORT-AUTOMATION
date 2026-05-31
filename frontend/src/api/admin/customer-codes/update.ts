/** `PATCH /admin/customer-codes/{id}` — update mutable fields on a customer code record. */

import { patchData } from "@/api/client"
import type { CustomerCode, UpdateCustomerCodeInput } from "@/types/admin/customer-code"

export function updateCustomerCode(id: string, input: UpdateCustomerCodeInput): Promise<CustomerCode> {
  return patchData<CustomerCode>(`/admin/customer-codes/${id}`, input)
}

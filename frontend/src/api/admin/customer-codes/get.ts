/** `GET /admin/customer-codes/{id}` — fetch a single customer code by ID. */

import { getData } from "@/api/client"
import type { CustomerCode } from "@/types/admin/customer-code"

export function getCustomerCode(id: string): Promise<CustomerCode> {
  return getData<CustomerCode>(`/admin/customer-codes/${id}`)
}

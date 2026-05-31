/** `POST /admin/customer-codes` — create a new customer code record. */

import { postData } from "@/api/client"
import type { CustomerCode, CreateCustomerCodeInput } from "@/types/admin/customer-code"

export function createCustomerCode(input: CreateCustomerCodeInput): Promise<CustomerCode> {
  return postData<CustomerCode>("/admin/customer-codes", input)
}

/**
 * `POST /admin/customer-codes/bulk-delete` — delete multiple customer codes by id.
 */

import { postData } from "@/api/client"

export interface BulkDeleteCustomerCodesRequest {
  ids: string[]
}

export interface BulkDeleteCustomerCodesResponse {
  deleted: number
}

/**
 * Delete the customer codes with the provided ids.
 *
 * @param payload - Object containing the list of ids to delete.
 * @returns The number of documents actually deleted.
 */
export async function bulkDeleteCustomerCodes(
  payload: BulkDeleteCustomerCodesRequest,
): Promise<number> {
  const result = await postData<BulkDeleteCustomerCodesResponse>(
    "/admin/customer-codes/bulk-delete",
    payload,
  )
  return result.deleted
}

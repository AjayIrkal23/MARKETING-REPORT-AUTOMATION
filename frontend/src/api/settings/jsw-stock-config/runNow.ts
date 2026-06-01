/** POST /admin/jsw-stock/run-now — trigger an immediate poll cycle. */
import { postData } from "@/api/client"
import type { JswStockStatus } from "@/types/settings/jsw-stock-config"

export function runJswStockCheckNow(): Promise<JswStockStatus> {
  return postData<JswStockStatus>("/admin/jsw-stock/run-now", {})
}

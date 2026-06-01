/** GET /admin/jsw-stock/status — ingestion status + recent runs. */
import { getData } from "@/api/client"
import type { JswStockStatus } from "@/types/settings/jsw-stock-config"

export function getJswStockStatus(): Promise<JswStockStatus> {
  return getData<JswStockStatus>("/admin/jsw-stock/status")
}

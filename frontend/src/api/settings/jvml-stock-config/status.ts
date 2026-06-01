/** GET /admin/jvml-stock/status — ingestion status + recent runs. */
import { getData } from "@/api/client"
import type { JvmlStockStatus } from "@/types/settings/jvml-stock-config"

export function getJvmlStockStatus(): Promise<JvmlStockStatus> {
  return getData<JvmlStockStatus>("/admin/jvml-stock/status")
}

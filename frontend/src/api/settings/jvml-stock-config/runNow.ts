/** POST /admin/jvml-stock/run-now — trigger an immediate poll cycle. */
import { postData } from "@/api/client"
import type { JvmlStockStatus } from "@/types/settings/jvml-stock-config"

export function runJvmlStockCheckNow(): Promise<JvmlStockStatus> {
  return postData<JvmlStockStatus>("/admin/jvml-stock/run-now", {})
}

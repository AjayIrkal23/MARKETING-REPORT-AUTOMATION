/** GET /admin/jvml-stock/config — load singleton config. */
import { getData } from "@/api/client"
import type { JvmlStockConfig } from "@/types/settings/jvml-stock-config"

export function getJvmlStockConfig(): Promise<JvmlStockConfig> {
  return getData<JvmlStockConfig>("/admin/jvml-stock/config")
}

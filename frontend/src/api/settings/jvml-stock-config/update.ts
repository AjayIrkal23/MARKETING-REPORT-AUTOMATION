/** PUT /admin/jvml-stock/config — full config replacement (upsert singleton). */
import { putData } from "@/api/client"
import type { JvmlStockConfig, JvmlStockConfigInput } from "@/types/settings/jvml-stock-config"

export function updateJvmlStockConfig(
  body: JvmlStockConfigInput,
): Promise<JvmlStockConfig> {
  return putData<JvmlStockConfig>("/admin/jvml-stock/config", body)
}

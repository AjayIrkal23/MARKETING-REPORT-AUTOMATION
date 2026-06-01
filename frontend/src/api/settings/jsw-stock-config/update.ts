/** PUT /admin/jsw-stock/config — full config replacement (upsert singleton). */
import { putData } from "@/api/client"
import type { JswStockConfig, JswStockConfigInput } from "@/types/settings/jsw-stock-config"

export function updateJswStockConfig(
  body: JswStockConfigInput,
): Promise<JswStockConfig> {
  return putData<JswStockConfig>("/admin/jsw-stock/config", body)
}

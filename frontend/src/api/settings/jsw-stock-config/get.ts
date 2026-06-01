/** GET /admin/jsw-stock/config — load singleton config. */
import { getData } from "@/api/client"
import type { JswStockConfig } from "@/types/settings/jsw-stock-config"

export function getJswStockConfig(): Promise<JswStockConfig> {
  return getData<JswStockConfig>("/admin/jsw-stock/config")
}

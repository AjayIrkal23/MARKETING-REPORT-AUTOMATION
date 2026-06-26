/** PUT /admin/cleanup/config — full config replacement (upsert singleton). */
import { putData } from "@/api/client"
import type { CleanupConfig, CleanupConfigInput } from "@/types/settings/cleanup-config"

export function updateCleanupConfig(body: CleanupConfigInput): Promise<CleanupConfig> {
  return putData<CleanupConfig>("/admin/cleanup/config", body)
}

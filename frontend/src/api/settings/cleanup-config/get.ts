/** GET /admin/cleanup/config — load the cleanup policy singleton. */
import { getData } from "@/api/client"
import type { CleanupConfig } from "@/types/settings/cleanup-config"

export function getCleanupConfig(): Promise<CleanupConfig> {
  return getData<CleanupConfig>("/admin/cleanup/config")
}

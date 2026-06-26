/** POST /admin/cleanup/run-now — run the cleanup immediately (respects enabled). */
import { postData } from "@/api/client"
import type { CleanupConfig } from "@/types/settings/cleanup-config"

export function runCleanupNow(): Promise<CleanupConfig> {
  return postData<CleanupConfig>("/admin/cleanup/run-now", {})
}

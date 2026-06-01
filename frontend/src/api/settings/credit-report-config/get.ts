/** GET /admin/credit-report/config — load singleton config. */
import { getData } from "@/api/client"
import type { CreditReportConfig } from "@/types/settings/credit-report-config"

export function getCreditReportConfig(): Promise<CreditReportConfig> {
  return getData<CreditReportConfig>("/admin/credit-report/config")
}

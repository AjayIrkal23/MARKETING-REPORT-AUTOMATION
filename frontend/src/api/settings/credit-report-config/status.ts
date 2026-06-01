/** GET /admin/credit-report/status — ingestion status + recent runs. */
import { getData } from "@/api/client"
import type { CreditReportStatus } from "@/types/settings/credit-report-config"

export function getCreditReportStatus(): Promise<CreditReportStatus> {
  return getData<CreditReportStatus>("/admin/credit-report/status")
}

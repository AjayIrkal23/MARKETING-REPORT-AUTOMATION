/** POST /admin/credit-report/run-now — trigger an immediate poll cycle. */
import { postData } from "@/api/client"
import type { CreditReportStatus } from "@/types/settings/credit-report-config"

export function runCreditReportCheckNow(): Promise<CreditReportStatus> {
  return postData<CreditReportStatus>("/admin/credit-report/run-now", {})
}

/** POST /admin/credit-report/run-now/{regionId} — trigger one zone poll. */
import { postData } from "@/api/client"
import type { CreditReportStatus } from "@/types/settings/credit-report-config"

export function runCreditReportZoneNow(regionId: string): Promise<CreditReportStatus> {
  return postData<CreditReportStatus>(
    `/admin/credit-report/run-now/${encodeURIComponent(regionId)}`,
    {},
  )
}

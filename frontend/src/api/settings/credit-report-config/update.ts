/** PUT /admin/credit-report/config — full config replacement (upsert singleton). */
import { putData } from "@/api/client"
import type { CreditReportConfig, CreditReportConfigInput } from "@/types/settings/credit-report-config"

export function updateCreditReportConfig(
  body: CreditReportConfigInput,
): Promise<CreditReportConfig> {
  return putData<CreditReportConfig>("/admin/credit-report/config", body)
}

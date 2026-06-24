/**
 * CreditReportConfigCard — admin config for the Credit Report Excel ingestion job.
 *
 * Thin wrapper (FE-9: zero props, owns useCreditReportConfig() internally). All
 * presentation lives in the shared <StockConfigPanel>; the only Credit-Report-specific
 * behaviour (file-name denylist, labels) is carried by CREDIT_REPORT_DOMAIN.
 */
import { CREDIT_REPORT_DOMAIN } from "./config-domains"
import { CreditReportZonesPanel } from "./CreditReportZonesPanel"
import { StockConfigPanel } from "./StockConfigPanel"
import { useCreditReportConfig } from "./hooks/useCreditReportConfig"

export function CreditReportConfigCard() {
  const ctl = useCreditReportConfig()
  return (
    <StockConfigPanel domain={CREDIT_REPORT_DOMAIN} ctl={ctl} showRunNow={false}>
      <CreditReportZonesPanel
        status={ctl.status}
        isLoading={ctl.isLoading}
        isRunningAll={ctl.isRunning}
        runningZoneId={ctl.runningZoneId}
        onRunZone={ctl.runZoneNow}
      />
    </StockConfigPanel>
  )
}

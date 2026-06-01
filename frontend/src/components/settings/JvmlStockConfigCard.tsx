/**
 * JvmlStockConfigCard — admin config for the JVML Stock Excel ingestion job.
 *
 * Thin wrapper (FE-9: zero props, owns useJvmlStockConfig() internally). All
 * presentation lives in the shared <StockConfigPanel>; the only JVML-specific
 * behaviour (file-name denylist that allows spaces/parens like "JVML Stock
 * (99)", labels) is carried by JVML_DOMAIN.
 */
import { JVML_DOMAIN } from "./config-domains"
import { StockConfigPanel } from "./StockConfigPanel"
import { useJvmlStockConfig } from "./hooks/useJvmlStockConfig"

export function JvmlStockConfigCard() {
  const ctl = useJvmlStockConfig()
  return <StockConfigPanel domain={JVML_DOMAIN} ctl={ctl} />
}

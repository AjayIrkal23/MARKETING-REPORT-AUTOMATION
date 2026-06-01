/**
 * JswStockConfigCard — admin config for the JSW Stock Excel ingestion job.
 *
 * Thin wrapper (FE-9: zero props, owns useJswStockConfig() internally). All
 * presentation lives in the shared <StockConfigPanel>; the only JSW-specific
 * behaviour (strict file-name validation, labels) is carried by JSW_DOMAIN.
 */
import { JSW_DOMAIN } from "./config-domains"
import { StockConfigPanel } from "./StockConfigPanel"
import { useJswStockConfig } from "./hooks/useJswStockConfig"

export function JswStockConfigCard() {
  const ctl = useJswStockConfig()
  return <StockConfigPanel domain={JSW_DOMAIN} ctl={ctl} />
}

/**
 * Presentation config for the dashboard report cards — maps each report key to
 * its icon. Pure presentation; all status/business data comes from the backend
 * `DashboardReportStatus`. Kept as data (not JSX) so the card stays declarative.
 */

import { Boxes, Layers, CreditCard, type LucideIcon } from "lucide-react"
import type { DashboardReportKey } from "@/types/dashboard/summary"

/** Icon per report domain (distinct glyph so the three cards read at a glance). */
export const REPORT_ICONS: Record<DashboardReportKey, LucideIcon> = {
  jsw_stock: Boxes,
  jvml_stock: Layers,
  credit_report: CreditCard,
}

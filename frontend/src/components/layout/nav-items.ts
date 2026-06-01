import type { LucideIcon } from "lucide-react"
import { Boxes, Building2, CreditCard, Disc3, FileSpreadsheet, LayoutDashboard, MapPin, ScrollText, Settings, UsersRound } from "lucide-react"

export interface NavItem {
  label: string
  to: string
  icon: LucideIcon
}

export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", to: "/home", icon: LayoutDashboard },
  { label: "JVML Stock List", to: "/jvml-stock", icon: Boxes },
  { label: "JSW Stock List", to: "/jsw-stock", icon: Boxes },
  { label: "Credit Report", to: "/credit-report", icon: CreditCard },
  { label: "Report JSW/JVML", to: "/report", icon: FileSpreadsheet },
]

export const ADMIN_NAV_ITEMS: NavItem[] = [
  { label: "User Management", to: "/admin/users", icon: UsersRound },
  { label: "Audit Logs", to: "/admin/audit-logs", icon: ScrollText },
  { label: "Region Management", to: "/admin/regions", icon: MapPin },
  { label: "Customer Codes", to: "/admin/customer-codes", icon: Building2 },
  { label: "Coil Config", to: "/admin/coil-config", icon: Disc3 },
  { label: "Settings", to: "/admin/settings", icon: Settings },
]

/** Resolve the page title for the current pathname (exact or nested match). */
export function titleForPath(pathname: string): string {
  const allItems = [...NAV_ITEMS, ...ADMIN_NAV_ITEMS]
  const match = allItems.find(
    (i) => pathname === i.to || pathname.startsWith(i.to + "/"),
  )
  return match?.label ?? "Dashboard"
}

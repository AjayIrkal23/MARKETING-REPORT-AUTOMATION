import type { LucideIcon } from "lucide-react"
import { Building2, LayoutDashboard, MapPin, ScrollText, UsersRound } from "lucide-react"

export interface NavItem {
  label: string
  to: string
  icon: LucideIcon
}

export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", to: "/home", icon: LayoutDashboard },
]

export const ADMIN_NAV_ITEMS: NavItem[] = [
  { label: "User Management", to: "/admin/users", icon: UsersRound },
  { label: "Audit Logs", to: "/admin/audit-logs", icon: ScrollText },
  { label: "Region Management", to: "/admin/regions", icon: MapPin },
  { label: "Customer Codes", to: "/admin/customer-codes", icon: Building2 },
]

/** Resolve the page title for the current pathname (exact or nested match). */
export function titleForPath(pathname: string): string {
  const allItems = [...NAV_ITEMS, ...ADMIN_NAV_ITEMS]
  const match = allItems.find(
    (i) => pathname === i.to || pathname.startsWith(i.to + "/"),
  )
  return match?.label ?? "Dashboard"
}

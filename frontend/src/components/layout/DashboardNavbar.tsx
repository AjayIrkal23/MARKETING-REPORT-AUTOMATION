import { useLocation } from "react-router-dom"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { ModeToggle } from "@/components/theme/mode-toggle"
import { UserMenu } from "@/components/layout/UserMenu"
import { titleForPath } from "@/components/layout/nav-items"

export function DashboardNavbar() {
  const { pathname } = useLocation()
  const title = titleForPath(pathname)

  return (
    <header
      className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b border-border bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80"
    >
      {/* Left: sidebar toggle + divider + page title */}
      <SidebarTrigger />
      <Separator orientation="vertical" className="mr-1 h-5" />
      <h1 className="text-sm font-semibold text-foreground">{title}</h1>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right: theme toggle + user menu */}
      <div className="flex items-center gap-1">
        <ModeToggle />
        <UserMenu />
      </div>
    </header>
  )
}

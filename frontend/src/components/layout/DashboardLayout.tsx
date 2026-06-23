import { Outlet } from "react-router-dom"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/layout/AppSidebar"
import { DashboardNavbar } from "@/components/layout/DashboardNavbar"

export function DashboardLayout() {
  return (
    <SidebarProvider>
      <AppSidebar />
      {/* min-w-0 lets the flex child shrink below its content width, so wide
          tables scroll inside their own box instead of widening the whole page. */}
      <SidebarInset className="min-w-0">
        <DashboardNavbar />
        <main className="min-w-0 flex-1 p-4 md:p-6">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}

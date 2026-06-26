import { NavLink, useLocation } from "react-router-dom"
import { ChevronRight } from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { NAV_ITEMS, ADMIN_NAV_ITEMS } from "@/components/layout/nav-items"
import { useAppSelector } from "@/app/hooks"
import { selectIsAdmin } from "@/store/auth/selectors"

// Shared menu-button styling, reused by leaf nav items, the collapsible
// "Stock List" trigger, and the admin items (previously duplicated inline).
const navButtonClass = `
  relative h-9 gap-3 rounded-md pl-3
  text-sidebar-foreground/80
  transition-all duration-150 ease-in-out
  hover:bg-sidebar-accent hover:text-sidebar-accent-foreground
  focus-visible:ring-2 focus-visible:ring-sidebar-ring
  data-[active=true]:bg-sidebar-accent
  data-[active=true]:font-medium
  data-[active=true]:text-sidebar-accent-foreground
  [&_svg]:transition-colors [&_svg]:duration-150
  data-[active=true]:[&_svg]:text-sidebar-primary
  group-data-[collapsible=icon]:pl-2
`

// ─────────────────────────────────────────────────────────────────────────────
// AppSidebar — premium redesign
//
// Design decisions:
//   • Header: vertical stack (logo chip → wordmark → gold accent bar → subtitle)
//     so the brand reads as a coherent identity block, not a cramped row.
//   • Surface depth: soft gold radial glow + faint blueprint grid (pointer-events-none,
//     aria-hidden) mirror BrandPanel.tsx motifs for visual continuity.
//   • Active state: 3-px gold left-edge bar (pseudo-sibling div) + gold icon tint +
//     bg-sidebar-accent background + font-medium label. Clearly premium, not garish.
//   • Hover: bg-sidebar-accent with 150 ms ease transition.
//   • Section label: uppercase, tracked, muted at /50 opacity.
//   • Footer: gold status dot + "Central Region" label above border-t.
//   • Collapsed (icon) state: text nodes carry group-data-[collapsible=icon]:hidden
//     so only icons remain at 3rem width; the logo chip stays centered.
// ─────────────────────────────────────────────────────────────────────────────

export function AppSidebar() {
  const { pathname } = useLocation()
  const isAdmin = useAppSelector(selectIsAdmin)

  return (
    <Sidebar collapsible="icon">

      {/* ── Decorative background layer (surface depth) ───────────────── */}
      {/* Soft gold/indigo glow near the top — mirrors BrandPanel motif   */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-20 -left-16 size-72 rounded-full bg-sidebar-primary/10 blur-3xl"
      />
      {/* Faint blueprint grid fading toward bottom-right                  */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "linear-gradient(to right, var(--sidebar-foreground) 1px, transparent 1px), linear-gradient(to bottom, var(--sidebar-foreground) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
          maskImage:
            "radial-gradient(110% 70% at 10% 0%, black, transparent 70%)",
          WebkitMaskImage:
            "radial-gradient(110% 70% at 10% 0%, black, transparent 70%)",
        }}
      />

      {/* ── Header: vertical brand stack ─────────────────────────────── */}
      <SidebarHeader className="relative z-10 items-center border-b border-sidebar-border px-3 pb-4 pt-5">
        {/*
          Logo chip — larger, centered.
          Collapses gracefully: in icon mode it stays centered (items-center on parent).
          The subtitle/wordmark divs hide via group-data-[collapsible=icon]:hidden.
        */}
        <div
          className="
            flex shrink-0 items-center justify-center
            rounded-lg bg-white px-4 py-2.5
            shadow-sm ring-1 ring-black/[0.06]
            transition-all duration-200
          "
        >
          <img
            src="/logo.png"
            alt="JSW Steel"
            className="h-14 w-auto"
          />
        </div>

        {/* Wordmark block — hidden in icon-collapsed mode */}
        <div className="mt-3 flex flex-col items-center gap-1 group-data-[collapsible=icon]:hidden">
          <span className="text-sm font-semibold tracking-tight text-sidebar-foreground">
            Marketing Reports
          </span>
          {/* Gold accent rule — mirrors BrandPanel's h-1 w-10 bar */}
          <div className="h-px w-8 rounded-full bg-sidebar-primary/70" />
          <span className="mt-0.5 text-[10px] uppercase tracking-wide text-sidebar-foreground/45">
            Marketing Intelligence
          </span>
        </div>
      </SidebarHeader>

      {/* ── Navigation ───────────────────────────────────────────────── */}
      <SidebarContent className="relative z-10">
        <SidebarGroup>
          {/* Refined section label: uppercase, wider tracking, muted */}
          <SidebarGroupLabel className="px-3 text-[10px] font-medium uppercase tracking-widest text-sidebar-foreground/45">
            Navigation
          </SidebarGroupLabel>

          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5 px-1">
              {NAV_ITEMS.map((item) => {
                // ── Group parent (e.g. "Stock List") → collapsible sub-menu ──
                if (item.children) {
                  const childActive = item.children.some(
                    (c) =>
                      pathname === c.to || pathname.startsWith(c.to + "/"),
                  )

                  return (
                    <Collapsible
                      key={item.label}
                      asChild
                      defaultOpen={childActive}
                      className="group/collapsible"
                    >
                      <SidebarMenuItem className="relative">
                        {childActive && (
                          <div
                            aria-hidden
                            className="
                              absolute inset-y-1 left-0 w-[3px] rounded-full
                              bg-sidebar-primary
                              group-data-[collapsible=icon]:hidden
                            "
                          />
                        )}

                        <CollapsibleTrigger asChild>
                          <SidebarMenuButton
                            isActive={childActive}
                            tooltip={item.label}
                            size="default"
                            className={navButtonClass}
                          >
                            <item.icon aria-hidden="true" />
                            <span>{item.label}</span>
                            <ChevronRight
                              aria-hidden="true"
                              className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90 group-data-[collapsible=icon]:hidden"
                            />
                          </SidebarMenuButton>
                        </CollapsibleTrigger>

                        <CollapsibleContent>
                          <SidebarMenuSub>
                            {item.children.map((child) => {
                              const isActive =
                                pathname === child.to ||
                                pathname.startsWith(child.to + "/")

                              return (
                                <SidebarMenuSubItem key={child.to}>
                                  <SidebarMenuSubButton asChild isActive={isActive}>
                                    <NavLink to={child.to}>
                                      <span>{child.label}</span>
                                    </NavLink>
                                  </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                              )
                            })}
                          </SidebarMenuSub>
                        </CollapsibleContent>
                      </SidebarMenuItem>
                    </Collapsible>
                  )
                }

                // ── Leaf nav item ──────────────────────────────────────────
                const isActive =
                  pathname === item.to || pathname.startsWith(item.to + "/")

                return (
                  <SidebarMenuItem key={item.to} className="relative">
                    {/*
                      Gold left-edge active indicator bar.
                      Absolutely positioned so it doesn't affect button layout.
                      Hidden in icon-collapsed mode (group-data-[collapsible=icon]:hidden).
                    */}
                    {isActive && (
                      <div
                        aria-hidden
                        className="
                          absolute inset-y-1 left-0 w-[3px] rounded-full
                          bg-sidebar-primary
                          group-data-[collapsible=icon]:hidden
                        "
                      />
                    )}

                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.label}
                      size="default"
                      className={navButtonClass}
                    >
                      <NavLink to={item.to!}>
                        <item.icon aria-hidden="true" />
                        <span>{item.label}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* ── Administrator Config (admin-only) ───────────────────────── */}
        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel className="px-3 text-[10px] font-medium uppercase tracking-widest text-sidebar-foreground/45 group-data-[collapsible=icon]:hidden">
              Administrator Config
            </SidebarGroupLabel>

            <SidebarGroupContent>
              <SidebarMenu className="gap-0.5 px-1">
                {ADMIN_NAV_ITEMS.map((item) => {
                  const isActive =
                    pathname === item.to || pathname.startsWith(item.to + "/")

                  return (
                    <SidebarMenuItem key={item.to} className="relative">
                      {isActive && (
                        <div
                          aria-hidden
                          className="
                            absolute inset-y-1 left-0 w-[3px] rounded-full
                            bg-sidebar-primary
                            group-data-[collapsible=icon]:hidden
                          "
                        />
                      )}

                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        tooltip={item.label}
                        size="default"
                        className={navButtonClass}
                      >
                        <NavLink to={item.to!}>
                          <item.icon aria-hidden="true" />
                          <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      {/* ── Footer: elevated region indicator ───────────────────────── */}
      <SidebarFooter className="relative z-10 border-t border-sidebar-border px-3 py-3">
        <div className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center">
          {/* Gold/emerald status dot — always visible as a presence indicator */}
          <span
            aria-hidden
            className="size-1.5 shrink-0 rounded-full bg-sidebar-primary shadow-[0_0_6px_var(--sidebar-primary)]"
          />
          <span className="truncate text-[11px] font-medium tracking-wide text-sidebar-foreground/55 group-data-[collapsible=icon]:hidden">
            Central Region
          </span>
        </div>
      </SidebarFooter>

      {/* Drag-resize affordance */}
      <SidebarRail />
    </Sidebar>
  )
}

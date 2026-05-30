/**
 * ViewUserSheet — read-only detail panel for a single admin user.
 *
 * Slides in from the right as a Sheet. Displays all AdminUser fields:
 * name, email, role, status (UserStatusBadge), last login, created-at.
 * Presentational only — no API calls, no mutations.
 *
 * Contract: USER-MANAGEMENT-PLAN.md §4.7
 * Props:    ViewUserSheetProps from types/admin/user-ui.ts
 */

import { format, parseISO } from "date-fns"
import { MailIcon, ShieldCheckIcon, ShieldIcon, UserIcon } from "lucide-react"
import { Separator } from "@/components/ui/separator"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { UserStatusBadge } from "@/components/admin/users/UserStatusBadge"
import type { ViewUserSheetProps } from "@/types/admin/user-ui"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTs(iso: string | null): string {
  if (!iso) return "—"
  try {
    return format(parseISO(iso), "dd MMM yyyy, HH:mm")
  } catch {
    return iso
  }
}

// ---------------------------------------------------------------------------
// Sub-component: a single labelled row in the detail grid
// ---------------------------------------------------------------------------

interface DetailRowProps {
  label: string
  children: React.ReactNode
}

function DetailRow({ label, children }: DetailRowProps) {
  return (
    <div className="grid grid-cols-[7rem_1fr] items-start gap-x-3 py-2.5">
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide pt-0.5">
        {label}
      </span>
      <span className="text-sm text-foreground break-all">{children}</span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ViewUserSheet({ open, onOpenChange, user }: ViewUserSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex flex-col gap-0 p-0 sm:max-w-md">
        {/* ---- Header ---- */}
        <SheetHeader className="px-5 pt-5 pb-4">
          <div className="flex items-center gap-3">
            {/* Avatar placeholder — initials derived from name or email */}
            <div
              aria-hidden="true"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-base select-none"
            >
              {user
                ? (user.name ?? user.emailid).slice(0, 1).toUpperCase()
                : <UserIcon className="h-5 w-5" />}
            </div>

            <div className="min-w-0">
              <SheetTitle className="truncate">
                {user?.name ?? user?.emailid ?? "User Details"}
              </SheetTitle>
              <SheetDescription className="truncate text-xs">
                {user?.name ? user.emailid : "Account information"}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <Separator />

        {/* ---- Body ---- */}
        {user == null ? (
          /* Should not normally be visible, but guard gracefully */
          <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground px-6">
            No user selected.
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-5 py-2">
            {/* Identity section */}
            <p className="mt-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
              Identity
            </p>

            <DetailRow label="Name">
              <span className="flex items-center gap-1.5">
                <UserIcon
                  className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
                {user.name ?? <span className="italic text-muted-foreground">Not set</span>}
              </span>
            </DetailRow>

            <DetailRow label="Email">
              <span className="flex items-center gap-1.5">
                <MailIcon
                  className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
                {user.emailid}
              </span>
            </DetailRow>

            <DetailRow label="Role">
              <span className="flex items-center gap-1.5">
                {user.isAdmin ? (
                  <>
                    <ShieldCheckIcon
                      className="h-3.5 w-3.5 shrink-0 text-primary"
                      aria-hidden="true"
                    />
                    <span className="font-medium text-primary">Administrator</span>
                  </>
                ) : (
                  <>
                    <ShieldIcon
                      className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
                      aria-hidden="true"
                    />
                    <span>Standard user</span>
                  </>
                )}
              </span>
            </DetailRow>

            <Separator className="my-3" />

            {/* Status section */}
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
              Status
            </p>

            <DetailRow label="Account">
              <UserStatusBadge status={user.status} />
            </DetailRow>

            <Separator className="my-3" />

            {/* Timestamps section */}
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
              Timestamps
            </p>

            <DetailRow label="Created">
              {formatTs(user.createdAt)}
            </DetailRow>

            <DetailRow label="Last login">
              {formatTs(user.lastlogined)}
            </DetailRow>

            {/* Internal ID — useful for admins doing support */}
            <Separator className="my-3" />

            <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
              Reference
            </p>

            <DetailRow label="User ID">
              <span className="font-mono text-xs text-muted-foreground select-all">
                {user.id}
              </span>
            </DetailRow>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}

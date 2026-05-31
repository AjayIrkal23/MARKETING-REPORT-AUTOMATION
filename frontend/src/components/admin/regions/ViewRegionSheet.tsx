/**
 * ViewRegionSheet — read-only detail panel for a single region.
 *
 * Slides in from the right as a Sheet. Displays:
 *   - Name, status (RegionActiveBadge), Region ID
 *   - Recipients (one email per line; "No recipients" when empty)
 *   - Created / Updated timestamps
 *
 * Presentational only — no API calls, no mutations.
 *
 * Contract: .planning/regions/SPEC.md §2.4 / ADDENDUM §ViewRegionSheet
 * Props:    ViewRegionSheetProps from types/admin/region-ui (mirrors ViewUserSheetProps)
 */

import { format, parseISO } from "date-fns"
import { MapPin } from "lucide-react"
import { Separator } from "@/components/ui/separator"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { RegionActiveBadge } from "@/components/admin/regions/RegionActiveBadge"
import type { Region } from "@/types/admin/region"

// ---------------------------------------------------------------------------
// Props (inlined to avoid dependency on region-ui.ts which may not exist yet)
// ---------------------------------------------------------------------------

interface ViewRegionSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  region: Region | null
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Format an ISO-8601 timestamp for display. Copied verbatim from ViewUserSheet. */
function formatTs(iso: string | null): string {
  if (!iso) return "—"
  try {
    return format(parseISO(iso), "dd MMM yyyy, HH:mm")
  } catch {
    return iso
  }
}

// ---------------------------------------------------------------------------
// Sub-component: a single labelled row in the detail grid (DetailRow pattern)
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

export function ViewRegionSheet({ open, onOpenChange, region }: ViewRegionSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex flex-col gap-0 p-0 sm:max-w-md"
        aria-label="Region details"
      >
        {/* ---- Header ---- */}
        <SheetHeader className="px-5 pt-5 pb-4">
          <div className="flex items-center gap-3">
            {/* Icon chip — MapPin instead of user initials avatar */}
            <div
              aria-hidden="true"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
            >
              <MapPin className="h-5 w-5" />
            </div>

            <div className="min-w-0">
              <SheetTitle className="truncate">
                {region?.name ?? "Region Details"}
              </SheetTitle>
              <SheetDescription className="truncate text-xs">
                {region ? "Regional distribution group" : "No region selected"}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <Separator />

        {/* ---- Body ---- */}
        {region == null ? (
          /* Graceful guard — should not normally be visible */
          <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground px-6">
            No region selected.
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-5 py-2">

            {/* Identity section */}
            <p className="mt-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
              Identity
            </p>

            <DetailRow label="Name">
              {region.name}
            </DetailRow>

            <DetailRow label="Status">
              <RegionActiveBadge active={region.active} />
            </DetailRow>

            <DetailRow label="Region ID">
              <span className="font-mono text-xs text-muted-foreground select-all">
                {region.id}
              </span>
            </DetailRow>

            <Separator className="my-3" />

            {/* Recipients section */}
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
              Recipients
            </p>

            <div className="py-2">
              {region.emails.length === 0 ? (
                <span className="italic text-muted-foreground text-sm">No recipients</span>
              ) : (
                <>
                  <p className="text-xs text-muted-foreground mb-1.5">
                    {region.emails.length} recipient{region.emails.length !== 1 ? "s" : ""}
                  </p>
                  <ul className="flex flex-col gap-1">
                    {region.emails.map((email) => (
                      <li
                        key={email}
                        className="font-mono text-xs text-muted-foreground break-all"
                      >
                        {email}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>

            <Separator className="my-3" />

            {/* Timestamps section */}
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
              Timestamps
            </p>

            <DetailRow label="Created">
              {formatTs(region.created_at)}
            </DetailRow>

            <DetailRow label="Updated">
              {formatTs(region.updated_at)}
            </DetailRow>

          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}

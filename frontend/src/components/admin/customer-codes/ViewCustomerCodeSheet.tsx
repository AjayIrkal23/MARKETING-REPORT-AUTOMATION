/**
 * ViewCustomerCodeSheet — read-only detail panel for a single customer code.
 *
 * Slides in from the right as a Sheet. Displays all domain fields in labelled
 * sections:
 *   - Identity: Segment (SegmentBadge), Code (mono), Customer, Destination
 *   - Assignment: Region, Region ID
 *   - Contact & Routing: CAM, MOB No., Head, ROUTE
 *   - Ship-To: SHIP TO code, SHIP TO Customer
 *   - Record: Customer Code ID, Created / Updated timestamps
 *
 * Presentational only — no API calls, no mutations.
 *
 * Contract: .planning/customer-codes/SPEC.md §4.3 / ADDENDUM §Area 8
 * Props:    ViewCustomerCodeSheetProps from types/admin/customer-code-ui
 * Icon:     Building2 — consistent with nav-items, page header, table empty state
 */

import { format, parseISO } from "date-fns"
import { Building2 } from "lucide-react"
import { Separator } from "@/components/ui/separator"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { SegmentBadge } from "@/components/admin/customer-codes/SegmentBadge"
import type { CustomerCode } from "@/types/admin/customer-code"

// ---------------------------------------------------------------------------
// Props (inlined to avoid dependency on customer-code-ui.ts import order)
// ---------------------------------------------------------------------------

interface ViewCustomerCodeSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  customerCode: CustomerCode | null
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Format an ISO-8601 timestamp for display. Copied verbatim from ViewRegionSheet. */
function formatTs(iso: string | null | undefined): string {
  if (!iso) return "—"
  try {
    return format(parseISO(iso), "dd MMM yyyy, HH:mm")
  } catch {
    return iso
  }
}

/** Render an optional string field — shows "—" when null/undefined/empty. */
function optional(value: string | null | undefined): string {
  return value?.trim() ? value.trim() : "—"
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
// Section heading — small caps label above each logical group
// ---------------------------------------------------------------------------

interface SectionHeadingProps {
  className?: string
  children: React.ReactNode
}

function SectionHeading({ className = "mt-3 mb-1", children }: SectionHeadingProps) {
  return (
    <p
      className={`${className} text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70`}
    >
      {children}
    </p>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ViewCustomerCodeSheet({
  open,
  onOpenChange,
  customerCode,
}: ViewCustomerCodeSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex flex-col gap-0 p-0 sm:max-w-md"
        aria-label="Customer code details"
      >
        {/* ---- Header ---- */}
        <SheetHeader className="px-5 pt-5 pb-4">
          <div className="flex items-center gap-3">
            {/* Icon chip — Building2 (consistent with nav-items + page header) */}
            <div
              aria-hidden="true"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
            >
              <Building2 className="h-5 w-5" />
            </div>

            <div className="min-w-0">
              <SheetTitle className="truncate">
                {customerCode?.customer ?? "Customer Code Details"}
              </SheetTitle>
              <SheetDescription className="truncate text-xs">
                {customerCode
                  ? `Code ${customerCode.code} · ${customerCode.segment}`
                  : "No customer code selected"}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <Separator />

        {/* ---- Body ---- */}
        {customerCode == null ? (
          /* Graceful guard — should not normally be visible */
          <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground px-6">
            No customer code selected.
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-5 py-2">

            {/* Identity section */}
            <SectionHeading>Identity</SectionHeading>

            <DetailRow label="Segment">
              <SegmentBadge segment={customerCode.segment} />
            </DetailRow>

            <DetailRow label="Code">
              <span className="font-mono text-xs text-muted-foreground select-all">
                {customerCode.code}
              </span>
            </DetailRow>

            <DetailRow label="Customer">
              {customerCode.customer}
            </DetailRow>

            <DetailRow label="Destination">
              {customerCode.destination}
            </DetailRow>

            <Separator className="my-3" />

            {/* Assignment section */}
            <SectionHeading className="mb-1">Assignment</SectionHeading>

            <DetailRow label="Region">
              {customerCode.region_name ?? (
                <span className="italic text-muted-foreground text-sm">Unknown region</span>
              )}
            </DetailRow>

            <DetailRow label="Region ID">
              <span className="font-mono text-xs text-muted-foreground select-all">
                {customerCode.region_id}
              </span>
            </DetailRow>

            <Separator className="my-3" />

            {/* Contact & Routing section */}
            <SectionHeading className="mb-1">Contact &amp; Routing</SectionHeading>

            <DetailRow label="CAM">
              {optional(customerCode.cam)}
            </DetailRow>

            <DetailRow label="MOB No.">
              {optional(customerCode.mob)}
            </DetailRow>

            <DetailRow label="Head">
              {optional(customerCode.head)}
            </DetailRow>

            <DetailRow label="Route">
              {optional(customerCode.route)}
            </DetailRow>

            <Separator className="my-3" />

            {/* Ship-To section */}
            <SectionHeading className="mb-1">Ship-To</SectionHeading>

            <DetailRow label="Ship-To">
              <span className="font-mono text-xs text-muted-foreground select-all">
                {optional(customerCode.ship_to)}
              </span>
            </DetailRow>

            <DetailRow label="Ship-To Cust.">
              {optional(customerCode.ship_to_customer)}
            </DetailRow>

            <DetailRow label="Ship-To City">
              {optional(customerCode.ship_to_city)}
            </DetailRow>

            <DetailRow label="Rake">
              {optional(customerCode.rake)}
            </DetailRow>

            <DetailRow label="Transport Mode">
              {optional(customerCode.transport_mode)}
            </DetailRow>

            <Separator className="my-3" />

            {/* Record section */}
            <SectionHeading className="mb-1">Record</SectionHeading>

            <DetailRow label="Code ID">
              <span className="font-mono text-xs text-muted-foreground select-all">
                {customerCode.id}
              </span>
            </DetailRow>

            <DetailRow label="Created">
              {formatTs(customerCode.created_at)}
            </DetailRow>

            <DetailRow label="Updated">
              {formatTs(customerCode.updated_at)}
            </DetailRow>

          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}

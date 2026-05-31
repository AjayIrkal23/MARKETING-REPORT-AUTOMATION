/**
 * ViewAuditLogSheet — read-only detail panel for a single audit log entry.
 *
 * Slides in from the right (Sheet). Four tabs: Details, Request, Response, Raw.
 * Presentational only — no API calls, no mutations.
 *
 * Contract: .planning/audit/SPEC.md §B9
 * Props:    ViewAuditLogSheetProps from types/admin/audit-log-ui.ts
 */

import { format, parseISO } from "date-fns"
import { Separator } from "@/components/ui/separator"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AuditCategoryBadge } from "@/components/admin/audit-logs/AuditCategoryBadge"
import { AuditOutcomeBadge } from "@/components/admin/audit-logs/AuditOutcomeBadge"
import type { AuditLogDetail } from "@/types/admin/audit-log"
import type { ViewAuditLogSheetProps } from "@/types/admin/audit-log-ui"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTs(iso: string | null): string {
  if (!iso) return "—"
  try { return format(parseISO(iso), "dd MMM yyyy, HH:mm:ss") } catch { return iso }
}

const nil = (v: unknown): boolean => v === null || v === undefined
const str = (v: string | number | boolean | null | undefined): string => nil(v) ? "—" : String(v)

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[7rem_1fr] items-start gap-x-3 py-2.5">
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide pt-0.5">{label}</span>
      <span className="text-sm text-foreground break-all">{children}</span>
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
      {children}
    </p>
  )
}

function JsonBlock({ value, empty }: { value: Record<string, unknown> | null | undefined; empty: string }) {
  if (nil(value)) return <p className="text-sm text-muted-foreground italic py-4 text-center">{empty}</p>
  return (
    <pre className="rounded-md bg-muted/50 p-3 font-mono text-xs text-muted-foreground whitespace-pre-wrap break-all overflow-x-auto">
      {JSON.stringify(value, null, 2)}
    </pre>
  )
}

function SkeletonRows() {
  return (
    <div className="flex flex-col gap-3 px-5 py-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="grid grid-cols-[7rem_1fr] gap-x-3">
          <Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-3/4" />
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Details tab (extracted to keep main component short)
// ---------------------------------------------------------------------------

function DetailsTab({ d }: { d: AuditLogDetail }) {
  return (
    <TabsContent value="details" className="px-5 pb-4 mt-0">
      <SectionLabel>Event</SectionLabel>
      <DetailRow label="Time"><span className="tabular-nums">{formatTs(d.timestamp)}</span></DetailRow>
      <DetailRow label="Category"><AuditCategoryBadge category={d.category} /></DetailRow>
      <DetailRow label="Action"><span className="font-mono text-xs">{d.action}</span></DetailRow>
      <DetailRow label="Outcome"><AuditOutcomeBadge outcome={d.outcome} /></DetailRow>
      <DetailRow label="Source">{str(d.source)}</DetailRow>
      <DetailRow label="Summary">{d.summary || <span className="italic text-muted-foreground">—</span>}</DetailRow>
      <Separator className="my-3" />
      <SectionLabel>Actor</SectionLabel>
      <DetailRow label="Actor">{d.actor_email ?? <span className="italic text-muted-foreground">Anonymous</span>}</DetailRow>
      <DetailRow label="Is Admin">{nil(d.actor_is_admin) ? "—" : d.actor_is_admin ? "Yes" : "No"}</DetailRow>
      <DetailRow label="IP"><span className="font-mono text-xs">{str(d.ip)}</span></DetailRow>
      <DetailRow label="User Agent"><span className="break-all text-xs text-muted-foreground">{str(d.user_agent)}</span></DetailRow>
      <Separator className="my-3" />
      <SectionLabel>HTTP</SectionLabel>
      <DetailRow label="Method"><span className="font-mono text-xs">{str(d.method)}</span></DetailRow>
      <DetailRow label="Path"><span className="font-mono text-xs break-all">{str(d.path)}</span></DetailRow>
      <DetailRow label="Route"><span className="font-mono text-xs break-all">{str(d.route)}</span></DetailRow>
      <DetailRow label="Status">{str(d.status_code)}</DetailRow>
      <DetailRow label="Duration">{nil(d.duration_ms) ? "—" : <span className="tabular-nums">{d.duration_ms} ms</span>}</DetailRow>
      <Separator className="my-3" />
      <SectionLabel>Reference</SectionLabel>
      <DetailRow label="Log ID"><span className="font-mono text-xs text-muted-foreground select-all">{d.id}</span></DetailRow>
      <DetailRow label="Request ID"><span className="font-mono text-xs text-muted-foreground select-all">{str(d.request_id)}</span></DetailRow>
    </TabsContent>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ViewAuditLogSheet({ open, onOpenChange, detail, isLoading }: ViewAuditLogSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex flex-col gap-0 p-0 sm:max-w-lg">
        <SheetHeader className="px-5 pt-5 pb-4">
          <div className="flex items-center gap-3">
            <div
              aria-hidden="true"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary font-semibold select-none"
            >
              <span className="font-mono text-xs uppercase">
                {detail ? detail.category.slice(0, 2) : "—"}
              </span>
            </div>
            <div className="min-w-0">
              <SheetTitle className="truncate">{detail?.action ?? "Audit Log"}</SheetTitle>
              <SheetDescription className="truncate text-xs">{detail?.summary ?? "Event detail"}</SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <Separator />

        {isLoading && !detail ? (
          <SkeletonRows />
        ) : detail == null ? (
          <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground px-6">
            No audit log selected.
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            <Tabs defaultValue="details" className="flex flex-col h-full">
              <div className="px-5 pt-3 pb-0">
                <TabsList className="w-full justify-start">
                  <TabsTrigger value="details">Details</TabsTrigger>
                  <TabsTrigger value="request">Request</TabsTrigger>
                  <TabsTrigger value="response">Response</TabsTrigger>
                  <TabsTrigger value="raw">Raw</TabsTrigger>
                </TabsList>
              </div>

              <DetailsTab d={detail} />

              <TabsContent value="request" className="px-5 pb-4 mt-2">
                <JsonBlock value={detail.request_meta} empty="No request metadata captured." />
              </TabsContent>

              <TabsContent value="response" className="px-5 pb-4 mt-2 flex flex-col gap-3">
                <JsonBlock value={detail.response_meta} empty="No response metadata captured." />
                {detail.error && (
                  <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3">
                    <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-destructive/70">Error</p>
                    <pre className="rounded-md bg-muted/50 p-3 font-mono text-xs text-muted-foreground whitespace-pre-wrap break-all overflow-x-auto">
                      {JSON.stringify(detail.error, null, 2)}
                    </pre>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="raw" className="px-5 pb-4 mt-2">
                <pre className="rounded-md bg-muted/50 p-3 font-mono text-xs text-muted-foreground whitespace-pre-wrap break-all overflow-x-auto">
                  {JSON.stringify(detail, null, 2)}
                </pre>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}

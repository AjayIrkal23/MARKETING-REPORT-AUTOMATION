/**
 * CustomerCodeTable — server-driven sortable table for the Customer Code Management screen.
 * Columns: Segment (badge) · Code · Customer · Destination · Region · CAM · ROUTE · Ship-To City · RAKE · Transport Mode · Actions.
 * Loading: 8 skeleton rows. Empty state: Building2 icon. Error state: AlertCircle.
 * No client-side filtering — all sort/filter state is driven by the parent via props.
 * Contract source: .planning/customer-codes/SPEC.md §4.3 + ADDENDUM §Area 8.
 * Props: CustomerCodeTableProps in types/admin/customer-code-ui.ts.
 */
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { Checkbox } from "@/components/ui/checkbox"
import { SegmentBadge } from "./SegmentBadge"
import { RowActionsMenu } from "./RowActionsMenu"
import { cn } from "@/lib/utils"
import {
  ArrowUp, ArrowDown, ArrowUpDown, Building2, AlertCircle,
} from "lucide-react"
import type { CustomerCodeSortBy } from "@/types/admin/customer-code"
import type { CustomerCodeTableProps } from "@/types/admin/customer-code-ui"

// ── Helpers ───────────────────────────────────────────────────────────────────

const SKELETON_ROWS = 8

// ── SortableHead ──────────────────────────────────────────────────────────────

type SortKey = CustomerCodeSortBy

interface SortableHeadProps {
  label: string
  col: SortKey
  current: CustomerCodeSortBy | undefined
  order: "asc" | "desc" | undefined
  onSort: (col: SortKey) => void
  className?: string
}

function SortableHead({ label, col, current, order, onSort, className }: SortableHeadProps) {
  const active = current === col
  const Icon = active ? (order === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown
  return (
    <TableHead
      className={cn(
        "cursor-pointer select-none whitespace-nowrap hover:text-foreground",
        active ? "text-foreground" : "text-muted-foreground",
        className,
      )}
      onClick={() => onSort(col)}
      aria-sort={active ? (order === "asc" ? "ascending" : "descending") : "none"}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <Icon
          className={cn("size-3 shrink-0", active ? "opacity-100" : "opacity-40")}
          aria-hidden
        />
      </span>
    </TableHead>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function CustomerCodeTable({
  rows, loading, error, sortBy, sortOrder,
  onSort, onView, onEdit, onDelete,
  selectedIds, onToggleSelection, onSelectAll,
}: CustomerCodeTableProps) {

  // ── Loading skeleton ──────────────────────────────────────────────────────

  if (loading) {
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">
              <Checkbox aria-label="Select all" checked={false} disabled />
            </TableHead>
            <TableHead className="text-muted-foreground">Segment</TableHead>
            <TableHead className="text-muted-foreground">Code</TableHead>
            <TableHead className="text-muted-foreground">Customer</TableHead>
            <TableHead className="text-muted-foreground">Destination</TableHead>
            <TableHead className="text-muted-foreground">Region</TableHead>
            <TableHead className="text-muted-foreground">CAM</TableHead>
            <TableHead className="text-muted-foreground">ROUTE</TableHead>
            <TableHead className="text-muted-foreground">Ship-To City</TableHead>
            <TableHead className="text-muted-foreground">RAKE</TableHead>
            <TableHead className="text-muted-foreground">Transport Mode</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: SKELETON_ROWS }).map((_, i) => (
            <TableRow key={i}>
              <TableCell><Skeleton className="size-4 rounded-[4px]" /></TableCell>
              <TableCell><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
              <TableCell><Skeleton className="h-3.5 w-24" /></TableCell>
              <TableCell><Skeleton className="h-3.5 w-40" /></TableCell>
              <TableCell><Skeleton className="h-3.5 w-28" /></TableCell>
              <TableCell><Skeleton className="h-3.5 w-24" /></TableCell>
              <TableCell><Skeleton className="h-3.5 w-24" /></TableCell>
              <TableCell><Skeleton className="h-3.5 w-16" /></TableCell>
              <TableCell><Skeleton className="h-3.5 w-24" /></TableCell>
              <TableCell><Skeleton className="h-3.5 w-20" /></TableCell>
              <TableCell><Skeleton className="h-3.5 w-20" /></TableCell>
              <TableCell><Skeleton className="size-7 rounded-md" /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    )
  }

  // ── Error state ───────────────────────────────────────────────────────────

  if (error) {
    return (
      <div
        role="alert"
        className="flex flex-col items-center justify-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 py-16 text-destructive"
      >
        <AlertCircle className="size-8 opacity-70 shrink-0" aria-hidden />
        <p className="text-sm font-medium">Failed to load customer codes</p>
        <p className="text-xs text-muted-foreground">{error}</p>
      </div>
    )
  }

  // ── Empty state ───────────────────────────────────────────────────────────

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground">
        <Building2 className="size-8 opacity-40" aria-hidden />
        <p className="text-sm font-medium">No customer codes found</p>
        <p className="text-xs opacity-70">Adjust the filters or import / create a new customer code.</p>
      </div>
    )
  }

  // ── Data table ────────────────────────────────────────────────────────────

  const sortProps = { current: sortBy, order: sortOrder, onSort }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          {/* Select all — checkbox column */}
          <TableHead className="w-10">
            <Checkbox
              aria-label="Select all customer codes on this page"
              checked={rows.length > 0 && rows.every((r) => selectedIds.has(r.id))}
              onCheckedChange={(checked) => onSelectAll(checked === true)}
            />
          </TableHead>
          {/* Segment sortable — in backend CustomerCodeSortBy whitelist */}
          <SortableHead label="Segment"     col="segment"     {...sortProps} className="min-w-[110px]" />
          {/* Code sortable */}
          <SortableHead label="Code"        col="code"        {...sortProps} className="min-w-[100px]" />
          {/* Customer sortable */}
          <SortableHead label="Customer"    col="customer"    {...sortProps} className="min-w-[180px]" />
          {/* Destination sortable */}
          <SortableHead label="Destination" col="destination" {...sortProps} />
          {/* Region — not in sort whitelist; plain head */}
          <TableHead className="text-muted-foreground">Region</TableHead>
          {/* CAM sortable */}
          <SortableHead label="CAM"         col="cam"         {...sortProps} />
          {/* ROUTE sortable */}
          <SortableHead label="ROUTE"       col="route"       {...sortProps} />
          {/* Ship-To City sortable */}
          <SortableHead label="Ship-To City" col="ship_to_city" {...sortProps} />
          {/* RAKE sortable */}
          <SortableHead label="RAKE" col="rake" {...sortProps} />
          {/* Transport Mode sortable */}
          <SortableHead label="Transport Mode" col="transport_mode" {...sortProps} />
          {/* Actions column — no label, fixed narrow width */}
          <TableHead className="w-10" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((cc) => (
          <TableRow key={cc.id}>

            {/* Row selection checkbox */}
            <TableCell>
              <Checkbox
                aria-label={`Select customer code ${cc.code}`}
                checked={selectedIds.has(cc.id)}
                onCheckedChange={() => onToggleSelection(cc.id)}
              />
            </TableCell>

            {/* Segment — SegmentBadge handles case-insensitive color mapping */}
            <TableCell>
              <SegmentBadge segment={cc.segment} />
            </TableCell>

            {/* Code — monospace, SAP numeric string; NOT unique */}
            <TableCell>
              <span className="font-mono text-xs text-foreground">
                {cc.code}
              </span>
            </TableCell>

            {/* Customer — truncate with tooltip for long values */}
            <TableCell className="max-w-[220px]">
              <span
                className="truncate block text-sm font-medium text-foreground"
                title={cc.customer}
              >
                {cc.customer}
              </span>
            </TableCell>

            {/* Destination */}
            <TableCell className="text-sm text-muted-foreground">
              {cc.destination}
            </TableCell>

            {/* Region — resolved server-side; null if region was deleted */}
            <TableCell className="text-sm text-muted-foreground">
              {cc.region_name ?? <span className="italic opacity-60">Unknown</span>}
            </TableCell>

            {/* CAM — optional; dash when absent */}
            <TableCell className="text-sm text-muted-foreground">
              {cc.cam ?? <span className="text-muted-foreground">—</span>}
            </TableCell>

            {/* ROUTE — optional; dash when absent */}
            <TableCell className="text-sm text-muted-foreground">
              {cc.route ?? <span className="text-muted-foreground">—</span>}
            </TableCell>

            {/* Ship-To City */}
            <TableCell className="text-sm text-muted-foreground">
              {cc.ship_to_city ?? <span className="text-muted-foreground">—</span>}
            </TableCell>

            {/* RAKE */}
            <TableCell className="text-sm text-muted-foreground">
              {cc.rake ?? <span className="text-muted-foreground">—</span>}
            </TableCell>

            {/* Transport Mode */}
            <TableCell className="text-sm text-muted-foreground">
              {cc.transport_mode ?? <span className="text-muted-foreground">—</span>}
            </TableCell>

            {/* Actions */}
            <TableCell className="text-right">
              <RowActionsMenu
                customerCode={cc}
                onView={onView}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            </TableCell>

          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

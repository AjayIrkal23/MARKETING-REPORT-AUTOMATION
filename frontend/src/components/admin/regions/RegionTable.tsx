/**
 * RegionTable — server-driven sortable table for the Region Management screen.
 * Columns: Name (sortable) · Recipients (email chips) · Status · Updated · Actions.
 * Loading: 8 skeleton rows. Empty state: MapPin icon. Error state: AlertCircle.
 * No client-side filtering — all sort/filter state is driven by the parent via props.
 * Contract source: .planning/regions/SPEC.md §2.4 + ADDENDUM §RegionTable.tsx.
 * Props: RegionTableProps in types/admin/region-ui.ts.
 */
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { RegionActiveBadge } from "./RegionActiveBadge"
import { RowActionsMenu } from "./RowActionsMenu"
import { cn } from "@/lib/utils"
import {
  ArrowUp, ArrowDown, ArrowUpDown, MapPin, AlertCircle,
} from "lucide-react"
import { format, parseISO } from "date-fns"
import type { RegionSortBy } from "@/types/admin/region"
import type { RegionTableProps } from "@/types/admin/region-ui"

// ── Helpers ───────────────────────────────────────────────────────────────────

const SKELETON_ROWS = 8

function fmtDate(iso: string): string {
  try { return format(parseISO(iso), "dd MMM yyyy") } catch { return "—" }
}

// ── SortableHead ──────────────────────────────────────────────────────────────

type SortKey = RegionSortBy

interface SortableHeadProps {
  label: string
  col: SortKey
  current: RegionSortBy | undefined
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

export function RegionTable({
  rows, loading, error, sortBy, sortOrder,
  onSort, onView, onEdit, onDelete, onToggleActive,
}: RegionTableProps) {

  // ── Loading skeleton ──────────────────────────────────────────────────────

  if (loading) {
    return (
      <Table>
        <TableHeader>
          <TableRow>
            {["Name", "Recipients", "Status", "Updated", ""].map((h) => (
              <TableHead key={h} className="text-muted-foreground">{h}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: SKELETON_ROWS }).map((_, i) => (
            <TableRow key={i}>
              <TableCell><Skeleton className="h-3.5 w-40" /></TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  <Skeleton className="h-5 w-28 rounded-md" />
                  <Skeleton className="h-5 w-32 rounded-md" />
                </div>
              </TableCell>
              <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
              <TableCell><Skeleton className="h-3.5 w-24" /></TableCell>
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
        <p className="text-sm font-medium">Failed to load regions</p>
        <p className="text-xs text-muted-foreground">{error}</p>
      </div>
    )
  }

  // ── Empty state ───────────────────────────────────────────────────────────

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground">
        <MapPin className="size-8 opacity-40" aria-hidden />
        <p className="text-sm font-medium">No regions found</p>
        <p className="text-xs opacity-70">Adjust the filters or create a new region.</p>
      </div>
    )
  }

  // ── Data table ────────────────────────────────────────────────────────────

  const sortProps = { current: sortBy, order: sortOrder, onSort }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <SortableHead label="Name"    col="name"       {...sortProps} className="min-w-[200px]" />
          <TableHead className="text-muted-foreground">Recipients</TableHead>
          <SortableHead label="Status"  col="active"     {...sortProps} />
          <SortableHead label="Updated" col="updated_at" {...sortProps} />
          <TableHead className="w-10" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((region) => (
          <TableRow key={region.id}>

            {/* Name */}
            <TableCell>
              <span className="truncate text-sm font-medium text-foreground max-w-[240px] block">
                {region.name}
              </span>
            </TableCell>

            {/* Recipients — first 3 chips + "+N more", "—" when empty */}
            <TableCell>
              {region.emails.length === 0 ? (
                <span className="text-muted-foreground">—</span>
              ) : (
                <div className="flex flex-wrap items-center gap-1">
                  {region.emails.slice(0, 3).map((email) => (
                    <span
                      key={email}
                      className="font-mono text-xs text-muted-foreground rounded bg-muted px-1.5 py-0.5"
                    >
                      {email}
                    </span>
                  ))}
                  {region.emails.length > 3 && (
                    <span className="text-xs text-muted-foreground">
                      +{region.emails.length - 3} more
                    </span>
                  )}
                </div>
              )}
            </TableCell>

            {/* Status */}
            <TableCell>
              <RegionActiveBadge active={region.active} />
            </TableCell>

            {/* Updated */}
            <TableCell className="text-sm text-muted-foreground tabular-nums">
              {fmtDate(region.updated_at)}
            </TableCell>

            {/* Actions */}
            <TableCell className="text-right">
              <RowActionsMenu
                region={region}
                onView={onView}
                onEdit={onEdit}
                onDelete={onDelete}
                onToggleActive={onToggleActive}
              />
            </TableCell>

          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

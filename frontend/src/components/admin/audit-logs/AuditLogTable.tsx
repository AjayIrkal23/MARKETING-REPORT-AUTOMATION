/**
 * AuditLogTable — server-driven paginated audit log table (Audit Logs admin screen).
 * Columns: Time · Category · Event · Actor · Method·Path · Status · Duration · Outcome · Actions.
 * Sortable headers call `onSort` — no client-side sort/filter.
 * Loading: skeleton rows. Empty / Error: centred states.
 * Contract: SPEC.md §B5. Props: `AuditLogTableProps` in types/admin/audit-log-ui.ts.
 */
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { AuditCategoryBadge } from "./AuditCategoryBadge"
import { AuditOutcomeBadge } from "./AuditOutcomeBadge"
import { cn } from "@/lib/utils"
import { ArrowUp, ArrowDown, ArrowUpDown, ScrollText, AlertTriangle, Eye } from "lucide-react"
import { format, parseISO } from "date-fns"
import type { AuditLogSortBy } from "@/types/admin/audit-log"
import type { AuditLogTableProps } from "@/types/admin/audit-log-ui"

// ── Helpers ──────────────────────────────────────────────────────────────────

const SKELETON_ROWS = 8

function fmtTime(iso: string): string {
  try { return format(parseISO(iso), "dd MMM HH:mm:ss") } catch { return "—" }
}

// ── Status code badge ─────────────────────────────────────────────────────────

function StatusBadge({ code }: { code: number | null }) {
  if (code === null) return <span className="text-muted-foreground">—</span>
  const cls =
    code >= 500
      ? "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/50 dark:text-red-400"
      : code >= 400
      ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-400"
      : code >= 300
      ? "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-400"
      : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400"
  return (
    <Badge variant="outline" className={cn("text-[10px] px-1.5 h-4 tabular-nums font-mono", cls)}>
      {code}
    </Badge>
  )
}

// ── Sortable header ───────────────────────────────────────────────────────────

interface SortableHeadProps {
  label: string
  col: AuditLogSortBy
  current: AuditLogSortBy
  order: "asc" | "desc"
  onSort: (col: AuditLogSortBy) => void
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
        <Icon className={cn("size-3 shrink-0", active ? "opacity-100" : "opacity-40")} aria-hidden />
      </span>
    </TableHead>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function AuditLogTable({
  rows, isLoading, error, sortBy, sortOrder, onSort, onView,
}: AuditLogTableProps) {

  if (isLoading) {
    return (
      <Table>
        <TableHeader>
          <TableRow>
            {["Time", "Category", "Event", "Actor", "Method · Path", "Status", "Duration", "Outcome", ""].map((h) => (
              <TableHead key={h} className="text-muted-foreground">{h}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: SKELETON_ROWS }).map((_, i) => (
            <TableRow key={i}>
              <TableCell><Skeleton className="h-3.5 w-28 tabular-nums" /></TableCell>
              <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
              <TableCell>
                <div className="flex flex-col gap-1.5">
                  <Skeleton className="h-3.5 w-44" />
                  <Skeleton className="h-3 w-28" />
                </div>
              </TableCell>
              <TableCell><Skeleton className="h-3.5 w-36" /></TableCell>
              <TableCell><Skeleton className="h-3.5 w-40" /></TableCell>
              <TableCell><Skeleton className="h-4 w-10 rounded-full" /></TableCell>
              <TableCell><Skeleton className="h-3.5 w-14" /></TableCell>
              <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
              <TableCell><Skeleton className="size-7 rounded-md" /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-16 text-destructive">
        <AlertTriangle className="size-8 opacity-70" aria-hidden />
        <p className="text-sm font-medium">Failed to load audit logs</p>
        <p className="text-xs text-muted-foreground">{error}</p>
      </div>
    )
  }

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground">
        <ScrollText className="size-8 opacity-40" aria-hidden />
        <p className="text-sm">No audit logs found</p>
        <p className="text-xs opacity-70">Adjust the filters or wait for new activity.</p>
      </div>
    )
  }

  const sortProps = { current: sortBy, order: sortOrder, onSort }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <SortableHead label="Time"     col="timestamp"   {...sortProps} className="min-w-[130px]" />
          <SortableHead label="Category" col="category"    {...sortProps} />
          <TableHead className="min-w-[200px] text-muted-foreground">Event</TableHead>
          <SortableHead label="Actor"    col="actor_email" {...sortProps} className="min-w-[160px]" />
          <TableHead className="min-w-[180px] text-muted-foreground">Method · Path</TableHead>
          <SortableHead label="Status"   col="status_code" {...sortProps} />
          <SortableHead label="Duration" col="duration_ms" {...sortProps} />
          <SortableHead label="Outcome"  col="outcome"     {...sortProps} />
          <TableHead className="w-10" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow
            key={row.id}
            className="cursor-pointer"
            onClick={() => onView(row.id)}
          >
            <TableCell className="text-xs text-muted-foreground tabular-nums whitespace-nowrap">
              {fmtTime(row.timestamp)}
            </TableCell>
            <TableCell>
              <AuditCategoryBadge category={row.category} />
            </TableCell>
            <TableCell>
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-medium text-foreground truncate max-w-[280px]">
                  {row.summary || "—"}
                </span>
                <span className="text-xs text-muted-foreground">{row.action}</span>
              </div>
            </TableCell>
            <TableCell className="text-sm text-muted-foreground truncate max-w-[200px]">
              {row.actor_email ?? <span className="opacity-50">—</span>}
            </TableCell>
            <TableCell>
              <span className="flex items-center gap-1.5 min-w-0">
                {row.method && (
                  <span className="font-mono text-xs text-foreground shrink-0">{row.method}</span>
                )}
                <span className="text-xs text-muted-foreground truncate max-w-[160px]">
                  {row.path ?? "—"}
                </span>
              </span>
            </TableCell>
            <TableCell>
              <StatusBadge code={row.status_code} />
            </TableCell>
            <TableCell className="text-xs text-muted-foreground tabular-nums whitespace-nowrap">
              {row.duration_ms != null ? `${row.duration_ms} ms` : <span className="opacity-50">—</span>}
            </TableCell>
            <TableCell>
              <AuditOutcomeBadge outcome={row.outcome} />
            </TableCell>
            <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                aria-label="View audit log details"
                onClick={() => onView(row.id)}
              >
                <Eye className="size-3.5" aria-hidden />
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

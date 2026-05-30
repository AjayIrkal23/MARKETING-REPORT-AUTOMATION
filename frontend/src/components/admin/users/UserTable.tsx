/**
 * UserTable — server-driven paginated user table (User Management admin screen).
 * Columns: Name/Email · Role · Status · Last login · Created · Actions.
 * Sortable headers call `onSortChange` — no client-side sort/filter.
 * Loading: skeleton rows. Empty / Error: centred states.
 * Contract: USER-MANAGEMENT-PLAN.md §4.7. Props: `UserTableProps` in types/admin/user-ui.ts.
 */
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { UserStatusBadge } from "./UserStatusBadge"
import { RowActionsMenu } from "./RowActionsMenu"
import { cn } from "@/lib/utils"
import { ArrowUp, ArrowDown, ArrowUpDown, ShieldCheck, User2, AlertTriangle } from "lucide-react"
import { format, parseISO } from "date-fns"
import type { AdminUserListQuery } from "@/types/admin/user"
import type { UserTableProps } from "@/types/admin/user-ui"

// ── Helpers ──────────────────────────────────────────────────────────────────

const SKELETON_ROWS = 8

function fmtDate(iso: string | null): string {
  if (!iso) return "—"
  try { return format(parseISO(iso), "dd MMM yyyy") } catch { return "—" }
}

// ── Sortable header ───────────────────────────────────────────────────────────

type SortKey = NonNullable<AdminUserListQuery["sortBy"]>

interface SortableHeadProps {
  label: string
  col: SortKey
  current: AdminUserListQuery["sortBy"]
  order: AdminUserListQuery["sortOrder"]
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
        <Icon className={cn("size-3 shrink-0", active ? "opacity-100" : "opacity-40")} aria-hidden />
      </span>
    </TableHead>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function UserTable({
  rows, isLoading, error, sortBy, sortOrder, currentUserEmail,
  onSortChange, onView, onEdit, onChangePassword, onEnable, onDisable, onDelete,
}: UserTableProps) {

  if (isLoading) {
    return (
      <Table>
        <TableHeader>
          <TableRow>
            {["Name / Email", "Role", "Status", "Last login", "Created", ""].map((h) => (
              <TableHead key={h} className="text-muted-foreground">{h}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: SKELETON_ROWS }).map((_, i) => (
            <TableRow key={i}>
              <TableCell>
                <div className="flex flex-col gap-1.5">
                  <Skeleton className="h-3.5 w-32" />
                  <Skeleton className="h-3 w-44" />
                </div>
              </TableCell>
              <TableCell><Skeleton className="h-5 w-14 rounded-full" /></TableCell>
              <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
              <TableCell><Skeleton className="h-3.5 w-24" /></TableCell>
              <TableCell><Skeleton className="h-3.5 w-24" /></TableCell>
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
        <p className="text-sm font-medium">Failed to load users</p>
        <p className="text-xs text-muted-foreground">{error}</p>
      </div>
    )
  }

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground">
        <User2 className="size-8 opacity-40" aria-hidden />
        <p className="text-sm">No users found</p>
        <p className="text-xs opacity-70">Adjust the filters or create a new user.</p>
      </div>
    )
  }

  const sortProps = { current: sortBy, order: sortOrder, onSort: onSortChange }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <SortableHead label="Name / Email" col="name" {...sortProps} className="min-w-[200px]" />
          <SortableHead label="Role"         col="isAdmin"     {...sortProps} />
          <SortableHead label="Status"       col="status"      {...sortProps} />
          <SortableHead label="Last login"   col="lastlogined" {...sortProps} />
          <SortableHead label="Created"      col="createdAt"   {...sortProps} />
          <TableHead className="w-10" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((user) => (
          <TableRow key={user.id}>
            <TableCell>
              <div className="flex flex-col gap-0.5">
                <span className="truncate text-sm font-medium text-foreground max-w-[220px]">
                  {user.name ?? <span className="italic text-muted-foreground">No name</span>}
                </span>
                <span className="truncate text-xs text-muted-foreground max-w-[220px]">
                  {user.emailid}
                </span>
              </div>
            </TableCell>
            <TableCell>
              {user.isAdmin ? (
                <Badge variant="outline" className="gap-1 border-primary/30 text-primary bg-primary/5">
                  <ShieldCheck className="size-3" aria-hidden />Admin
                </Badge>
              ) : (
                <Badge variant="outline" className="gap-1 text-muted-foreground">
                  <User2 className="size-3" aria-hidden />User
                </Badge>
              )}
            </TableCell>
            <TableCell><UserStatusBadge status={user.status} /></TableCell>
            <TableCell className="text-sm text-muted-foreground tabular-nums">
              {fmtDate(user.lastlogined)}
            </TableCell>
            <TableCell className="text-sm text-muted-foreground tabular-nums">
              {fmtDate(user.createdAt)}
            </TableCell>
            <TableCell className="text-right">
              <RowActionsMenu
                user={user} currentUserEmail={currentUserEmail}
                onView={onView} onEdit={onEdit} onChangePassword={onChangePassword}
                onEnable={onEnable} onDisable={onDisable} onDelete={onDelete}
              />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

/**
 * RowActionsMenu — per-row dropdown for the User Management table.
 *
 * Actions: View · Edit · Change password · Enable | Disable (contextual) · Delete.
 * Self-destructive actions (disable / delete own account) are disabled when
 * `user.emailid === currentUserEmail`.
 *
 * Contract: USER-MANAGEMENT-PLAN.md §4.7 `RowActionsMenu.tsx`.
 * Props: `RowActionsMenuProps` from `types/admin/user-ui.ts`.
 */

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import {
  EllipsisVertical,
  Eye,
  Pencil,
  KeyRound,
  UserCheck,
  UserX,
  Trash2,
} from "lucide-react"
import type { RowActionsMenuProps } from "@/types/admin/user-ui"

export function RowActionsMenu({
  user,
  currentUserEmail,
  onView,
  onEdit,
  onChangePassword,
  onEnable,
  onDisable,
  onDelete,
}: RowActionsMenuProps) {
  const isSelf = user.emailid === currentUserEmail
  const isDisabled = user.status === "disabled"

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-7 text-muted-foreground hover:text-foreground"
          aria-label={`Actions for ${user.name ?? user.emailid}`}
        >
          <EllipsisVertical className="size-4" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">
          {user.name ?? user.emailid}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {/* View */}
        <DropdownMenuGroup>
          <DropdownMenuItem onSelect={() => onView(user)}>
            <Eye className="mr-2 size-4 text-muted-foreground" />
            View
          </DropdownMenuItem>

          <DropdownMenuItem onSelect={() => onEdit(user)}>
            <Pencil className="mr-2 size-4 text-muted-foreground" />
            Edit
          </DropdownMenuItem>

          <DropdownMenuItem onSelect={() => onChangePassword(user)}>
            <KeyRound className="mr-2 size-4 text-muted-foreground" />
            Change password
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        {/* Enable / Disable — contextual on current status */}
        <DropdownMenuGroup>
          {isDisabled ? (
            <DropdownMenuItem
              onSelect={() => onEnable(user)}
            >
              <UserCheck className="mr-2 size-4 text-muted-foreground" />
              Enable
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              disabled={isSelf}
              onSelect={() => !isSelf && onDisable(user)}
            >
              <UserX className="mr-2 size-4 text-muted-foreground" />
              Disable
              {isSelf && (
                <span className="ml-auto text-[10px] text-muted-foreground">
                  (self)
                </span>
              )}
            </DropdownMenuItem>
          )}
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        {/* Delete — always destructive; self is blocked */}
        <DropdownMenuItem
          variant="destructive"
          disabled={isSelf}
          onSelect={() => !isSelf && onDelete(user)}
        >
          <Trash2 className="mr-2 size-4" />
          Delete
          {isSelf && (
            <span className="ml-auto text-[10px]">(self)</span>
          )}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

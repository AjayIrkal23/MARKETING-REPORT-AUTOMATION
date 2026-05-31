/**
 * RowActionsMenu — per-row dropdown for the Customer Code Management table.
 *
 * Actions: View · Edit · Delete.
 * No toggle-active action — customer codes have no active/inactive flag.
 *
 * Contract: .planning/customer-codes/SPEC.md §4.3 + ADDENDUM Area 8.
 * Props: `RowActionsMenuProps` from `types/admin/customer-code-ui.ts`.
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
import { EllipsisVertical, Eye, Pencil, Trash2 } from "lucide-react"
import type { RowActionsMenuProps } from "@/types/admin/customer-code-ui"

export function RowActionsMenu({
  customerCode,
  onView,
  onEdit,
  onDelete,
}: RowActionsMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-7 text-muted-foreground hover:text-foreground"
          aria-label={`Actions for ${customerCode.code} – ${customerCode.customer}`}
        >
          <EllipsisVertical className="size-4" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">
          {customerCode.code} – {customerCode.customer}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {/* View and Edit */}
        <DropdownMenuGroup>
          <DropdownMenuItem onSelect={() => onView(customerCode)}>
            <Eye className="mr-2 size-4 text-muted-foreground" />
            View
          </DropdownMenuItem>

          <DropdownMenuItem onSelect={() => onEdit(customerCode)}>
            <Pencil className="mr-2 size-4 text-muted-foreground" />
            Edit
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        {/* Delete — always destructive */}
        <DropdownMenuItem
          variant="destructive"
          onSelect={() => onDelete(customerCode)}
        >
          <Trash2 className="mr-2 size-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

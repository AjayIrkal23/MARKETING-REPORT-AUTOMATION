/**
 * RowActionsMenu — per-row dropdown for the Region Management table.
 *
 * Actions: View · Edit · Activate | Deactivate (contextual on region.active) · Delete.
 * No self-reference guard (regions are not user accounts).
 *
 * Contract: .planning/regions/SPEC.md §2.4 + ADDENDUM §RowActionsMenu.tsx.
 * Props: `RowActionsMenuProps` from `types/admin/region-ui.ts`.
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
  ToggleLeft,
  ToggleRight,
  Trash2,
} from "lucide-react"
import type { RowActionsMenuProps } from "@/types/admin/region-ui"

export function RowActionsMenu({
  region,
  onView,
  onEdit,
  onDelete,
  onToggleActive,
}: RowActionsMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-7 text-muted-foreground hover:text-foreground"
          aria-label={`Actions for ${region.name}`}
        >
          <EllipsisVertical className="size-4" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">
          {region.name}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {/* View and Edit */}
        <DropdownMenuGroup>
          <DropdownMenuItem onSelect={() => onView(region)}>
            <Eye className="mr-2 size-4 text-muted-foreground" />
            View
          </DropdownMenuItem>

          <DropdownMenuItem onSelect={() => onEdit(region)}>
            <Pencil className="mr-2 size-4 text-muted-foreground" />
            Edit
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        {/* Activate / Deactivate — contextual on region.active */}
        <DropdownMenuGroup>
          {region.active ? (
            <DropdownMenuItem onSelect={() => onToggleActive(region)}>
              <ToggleLeft className="mr-2 size-4 text-muted-foreground" />
              Deactivate
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onSelect={() => onToggleActive(region)}>
              <ToggleRight className="mr-2 size-4 text-muted-foreground" />
              Activate
            </DropdownMenuItem>
          )}
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        {/* Delete — always destructive */}
        <DropdownMenuItem
          variant="destructive"
          onSelect={() => onDelete(region)}
        >
          <Trash2 className="mr-2 size-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

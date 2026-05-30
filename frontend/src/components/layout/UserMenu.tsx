import { LogOut } from "lucide-react"

import { useAppSelector } from "@/app/hooks"
import { useLogout } from "@/components/auth/hooks/useLogout"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { selectSessionUser } from "@/store/auth/selectors"

/** Derive up to 2 initials from a display name, falling back to email[0] or "U". */
function deriveInitials(name?: string | null, email?: string | null): string {
  if (name) {
    const parts = name.trim().split(/[\s\W]+/).filter(Boolean)
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase()
    }
    if (parts.length === 1 && parts[0].length > 0) {
      return parts[0][0].toUpperCase()
    }
  }
  if (email && email.length > 0) {
    return email[0].toUpperCase()
  }
  return "U"
}

export function UserMenu() {
  const user = useAppSelector(selectSessionUser)
  const { logout, isPending } = useLogout()

  const initials = deriveInitials(user?.name, user?.email)
  const displayName = user?.name ?? "User"
  const displayEmail = user?.email ?? ""

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Open user menu"
          aria-haspopup="true"
        >
          <span className="sr-only">Open user menu</span>
          <Avatar className="size-8">
            <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="flex flex-col gap-0.5 px-2 py-1.5">
          <span className="font-medium truncate text-foreground leading-snug">
            {displayName}
          </span>
          <span className="text-xs text-muted-foreground truncate leading-snug">
            {displayEmail}
          </span>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          disabled={isPending}
          onSelect={(e) => {
            e.preventDefault()
            void logout()
          }}
          className="text-destructive focus:text-destructive focus:bg-destructive/10 dark:focus:bg-destructive/20 cursor-pointer"
        >
          <LogOut />
          {isPending ? "Signing out…" : "Log out"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

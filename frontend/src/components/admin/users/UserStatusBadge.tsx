/**
 * UserStatusBadge — maps a user account lifecycle status to a shadcn Badge.
 *
 * invited  → amber/secondary  (pending first-login OTP setup)
 * active   → emerald/default  (live account)
 * disabled → muted/outline    (blocked from login)
 *
 * Uses only semantic Tailwind/shadcn design tokens (no raw hex).
 * Contract: USER-MANAGEMENT-PLAN.md §4.7 `UserStatusBadge.tsx`.
 * Props: `UserStatusBadgeProps` from `types/admin/user-ui.ts`.
 */

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { UserStatusBadgeProps } from "@/types/admin/user-ui"

// Status → visual mapping. Badge variant provides the base shape; className
// provides the semantic colour override via standard Tailwind utility classes.
const STATUS_MAP = {
  invited: {
    label: "Invited",
    variant: "secondary",
    className:
      "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-400",
  },
  active: {
    label: "Active",
    variant: "default",
    className:
      "border-transparent bg-emerald-600 text-white dark:bg-emerald-700",
  },
  disabled: {
    label: "Disabled",
    variant: "outline",
    className:
      "border-border text-muted-foreground",
  },
} as const satisfies Record<
  string,
  {
    label: string
    variant: "secondary" | "default" | "outline"
    className: string
  }
>

export function UserStatusBadge({ status, compact = false }: UserStatusBadgeProps) {
  const cfg = STATUS_MAP[status]

  return (
    <Badge
      variant={cfg.variant}
      className={cn(cfg.className, compact && "text-[10px] px-1.5 h-4")}
      aria-label={`Account status: ${cfg.label}`}
    >
      {cfg.label}
    </Badge>
  )
}

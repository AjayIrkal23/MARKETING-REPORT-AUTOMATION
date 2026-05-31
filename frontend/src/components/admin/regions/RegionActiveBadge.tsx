/**
 * RegionActiveBadge — maps a region's active flag to a shadcn Badge.
 *
 * active   → solid emerald "Active"   (bg-emerald-600 text-white, ~4.8:1 contrast)
 * inactive → outline muted "Inactive" (border-border text-muted-foreground)
 *
 * Uses only semantic Tailwind/shadcn design tokens (no raw hex).
 * Contract: .planning/regions/SPEC.md §2.7 + ADDENDUM §RegionActiveBadge.tsx.
 * Props: `RegionActiveBadgeProps` from `types/admin/region-ui.ts`.
 */

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { RegionActiveBadgeProps } from "@/types/admin/region-ui"

// Status → visual mapping. Badge variant provides the base shape; className
// provides the semantic colour override via standard Tailwind utility classes.
const STATUS_MAP = {
  active: {
    label: "Active",
    variant: "default" as const,
    className: "border-transparent bg-emerald-600 text-white dark:bg-emerald-700",
  },
  inactive: {
    label: "Inactive",
    variant: "outline" as const,
    className: "border-border text-muted-foreground",
  },
} as const

export function RegionActiveBadge({ active, compact = false }: RegionActiveBadgeProps) {
  const cfg = active ? STATUS_MAP.active : STATUS_MAP.inactive
  return (
    <Badge
      variant={cfg.variant}
      className={cn(cfg.className, compact && "text-[10px] px-1.5 h-4")}
      aria-label={`Region status: ${cfg.label}`}
    >
      {cfg.label}
    </Badge>
  )
}

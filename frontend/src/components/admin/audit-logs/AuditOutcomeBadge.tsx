/**
 * AuditOutcomeBadge — maps an audit log outcome to a shadcn Badge.
 *
 * success  → emerald
 * failure  → amber
 * error    → red
 *
 * Uses only semantic Tailwind/shadcn design tokens and Tailwind color utilities
 * inside badge color triplets (no raw hex).
 * Contract: SPEC.md §B8 + types/admin/audit-log-ui.ts `AuditOutcomeBadgeProps`.
 */

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { AuditOutcomeBadgeProps } from "@/types/admin/audit-log-ui"

// Outcome → visual mapping. Badge variant="outline" provides the base shape;
// className provides the semantic colour override via Tailwind utility classes.
const OUTCOME_MAP = {
  success: {
    label: "Success",
    className:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400",
  },
  failure: {
    label: "Failure",
    className:
      "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-400",
  },
  error: {
    label: "Error",
    className:
      "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/50 dark:text-red-400",
  },
} as const satisfies Record<string, { label: string; className: string }>

export function AuditOutcomeBadge({ outcome, compact = false }: AuditOutcomeBadgeProps) {
  const cfg = OUTCOME_MAP[outcome]

  return (
    <Badge
      variant="outline"
      className={cn(cfg.className, compact && "text-[10px] px-1.5 h-4")}
      aria-label={`Audit outcome: ${cfg.label}`}
    >
      {cfg.label}
    </Badge>
  )
}

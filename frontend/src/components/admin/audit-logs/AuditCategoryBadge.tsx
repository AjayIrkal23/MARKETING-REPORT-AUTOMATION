/**
 * AuditCategoryBadge — maps an audit log category to a shadcn Badge.
 *
 * http      → slate
 * auth      → indigo
 * admin     → violet
 * data      → teal
 * system    → sky
 * cron      → amber
 * security  → red
 *
 * Uses only semantic Tailwind/shadcn design tokens and Tailwind color utilities
 * inside badge color triplets (no raw hex).
 * Contract: SPEC.md §B8 + types/admin/audit-log-ui.ts `AuditCategoryBadgeProps`.
 */

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { AuditCategoryBadgeProps } from "@/types/admin/audit-log-ui"

// Category → visual mapping. Badge variant="outline" provides the base shape;
// className provides the semantic colour override via Tailwind utility classes.
const CATEGORY_MAP = {
  http: {
    label: "HTTP",
    className:
      "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-400",
  },
  auth: {
    label: "Auth",
    className:
      "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-400",
  },
  admin: {
    label: "Admin",
    className:
      "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-800 dark:bg-violet-950/50 dark:text-violet-400",
  },
  data: {
    label: "Data",
    className:
      "border-teal-200 bg-teal-50 text-teal-700 dark:border-teal-800 dark:bg-teal-950/50 dark:text-teal-400",
  },
  system: {
    label: "System",
    className:
      "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-800 dark:bg-sky-950/50 dark:text-sky-400",
  },
  cron: {
    label: "Cron",
    className:
      "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-400",
  },
  security: {
    label: "Security",
    className:
      "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/50 dark:text-red-400",
  },
  regions: {
    label: "Regions",
    className:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400",
  },
  customer_codes: {
    label: "Customer Codes",
    className:
      "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-400",
  },
} as const satisfies Record<string, { label: string; className: string }>

export function AuditCategoryBadge({ category, compact = false }: AuditCategoryBadgeProps) {
  const cfg = CATEGORY_MAP[category]

  return (
    <Badge
      variant="outline"
      className={cn(cfg.className, compact && "text-[10px] px-1.5 h-4")}
      aria-label={`Audit category: ${cfg.label}`}
    >
      {cfg.label}
    </Badge>
  )
}

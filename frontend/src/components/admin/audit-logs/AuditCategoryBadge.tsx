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
 * users     → fuchsia
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
  jsw_stock: {
    label: "JSW Stock",
    className:
      "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-800 dark:bg-orange-950/50 dark:text-orange-400",
  },
  users: {
    label: "Users",
    className:
      "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700 dark:border-fuchsia-800 dark:bg-fuchsia-950/50 dark:text-fuchsia-400",
  },
  jvml_stock: {
    label: "JVML Stock",
    className:
      "border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-800 dark:bg-cyan-950/50 dark:text-cyan-400",
  },
  credit_report: {
    label: "Credit Report",
    className:
      "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/50 dark:text-blue-400",
  },
  coil_config: {
    label: "Coil Config",
    className:
      "border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-800 dark:bg-purple-950/50 dark:text-purple-400",
  },
  report: {
    label: "Report",
    className:
      "border-lime-200 bg-lime-50 text-lime-700 dark:border-lime-800 dark:bg-lime-950/50 dark:text-lime-400",
  },
} as const satisfies Record<string, { label: string; className: string }>

/** Neutral fallback for any category not present in CATEGORY_MAP. */
const FALLBACK_CFG = {
  className:
    "border-slate-300 bg-slate-100 text-slate-600 dark:border-slate-600 dark:bg-slate-800/50 dark:text-slate-300",
} as const

export function AuditCategoryBadge({ category, compact = false }: AuditCategoryBadgeProps) {
  const mapped = CATEGORY_MAP[category as keyof typeof CATEGORY_MAP]
  const cfg = mapped ?? FALLBACK_CFG
  const label = mapped?.label ?? category.replace(/_/g, " ").toUpperCase()

  return (
    <Badge
      variant="outline"
      className={cn(cfg.className, compact && "text-[10px] px-1.5 h-4")}
      aria-label={`Audit category: ${label}`}
    >
      {label}
    </Badge>
  )
}

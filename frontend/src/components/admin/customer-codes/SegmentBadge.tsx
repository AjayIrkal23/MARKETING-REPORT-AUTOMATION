/**
 * SegmentBadge — maps a CustomerCode segment value to a shadcn Badge.
 *
 * retail         → blue
 * oem            → violet
 * stock transfer → amber
 * project        → emerald
 * msme           → cyan
 * <default>      → slate
 *
 * Lookup is always case-insensitive: segment.trim().toLowerCase() is applied
 * before the map lookup. Stored values include "oem", "OEM", "Retail",
 * "Stock transfer" — mixed case is the norm, not an edge case.
 * (ADDENDUM Area 8 BLOCKER 5)
 *
 * Uses only semantic Tailwind/shadcn design tokens and Tailwind color utilities
 * inside badge color triplets (no raw hex).
 * Contract: .planning/customer-codes/SPEC.md §4.3 + types/admin/customer-code-ui.ts `SegmentBadgeProps`.
 */

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { SegmentBadgeProps } from "@/types/admin/customer-code-ui"

// ---------------------------------------------------------------------------
// Segment → visual mapping
// ---------------------------------------------------------------------------
// Badge variant="outline" provides the base shape; className provides the
// semantic colour override via Tailwind utility classes. Keys are normalised
// lowercase strings (the lookup always trims + lowercases the raw value).
// ---------------------------------------------------------------------------

type BadgeCfg = { label: string; className: string }

const SEGMENT_MAP: Record<string, BadgeCfg> = {
  retail: {
    label: "Retail",
    className:
      "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/50 dark:text-blue-400",
  },
  oem: {
    label: "OEM",
    className:
      "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-800 dark:bg-violet-950/50 dark:text-violet-400",
  },
  "stock transfer": {
    label: "Stock Transfer",
    className:
      "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-400",
  },
  project: {
    label: "Project",
    className:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400",
  },
  msme: {
    label: "MSME",
    className:
      "border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-800 dark:bg-cyan-950/50 dark:text-cyan-400",
  },
} satisfies Record<string, BadgeCfg>

/** Fallback for any segment value not present in SEGMENT_MAP. */
const DEFAULT_CFG: BadgeCfg = {
  label: "",
  className:
    "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-400",
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Renders the segment value as a colour-coded badge.
 *
 * Known segments (case-insensitive) get a distinct colour; unknown values fall
 * back to slate and display the raw segment string as-is.
 */
export function SegmentBadge({ segment, compact = false }: SegmentBadgeProps) {
  // Normalise for map lookup — stored values are mixed-case by design.
  const key = segment.trim().toLowerCase()
  const cfg = SEGMENT_MAP[key] ?? DEFAULT_CFG

  // For unknown segments, display the original value (preserve casing for display).
  const label = cfg.label || segment.trim()

  return (
    <Badge
      variant="outline"
      className={cn(cfg.className, compact && "text-[10px] px-1.5 h-4")}
      aria-label={`Segment: ${label}`}
    >
      {label}
    </Badge>
  )
}

/**
 * CustomerCodeTablePagination
 *
 * Purely presentational — no API calls, no local data state.
 * Props: CustomerCodeTablePaginationProps (contract: .planning/customer-codes/SPEC.md §4.3
 * + ADDENDUM Area 8 BLOCKER 4 + types/admin/customer-code-ui.ts).
 *
 * Renders:
 *   [← Prev]  Page X of N · N total  [page-size Select]  [Next →]
 *
 * Semantics:
 *   - All page/limit changes are delegated upward via onPageChange / onLimitChange.
 *   - meta === null → skeleton / disabled state so the bar is always visible.
 *   - page-size options: 10 / 20 / 50.
 *   - Uses shadcn Button + Select primitives; semantic tokens only.
 *   - Prop is `isLoading` (NOT `loading`) — ADDENDUM Area 8 BLOCKER 4.
 *   - Plural label: "customer code" / "customer codes" — ADDENDUM §frontend component do/dont.
 *   - File ≤ 250 lines; verbatimModuleSyntax (import type).
 */

import type { CustomerCodeTablePaginationProps } from "@/types/admin/customer-code-ui"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"

const PAGE_SIZE_OPTIONS = [10, 20, 50] as const

export function CustomerCodeTablePagination({
  meta,
  isLoading,
  onPageChange,
  onLimitChange,
}: CustomerCodeTablePaginationProps) {
  const page = meta?.page ?? 1
  const totalPages = meta?.totalPages ?? 1
  const total = meta?.total ?? 0
  const limit = meta?.limit ?? 20

  const isDisabled = isLoading || meta === null
  const hasPrev = page > 1
  const hasNext = page < totalPages

  function handlePrev() {
    if (hasPrev) onPageChange(page - 1)
  }

  function handleNext() {
    if (hasNext) onPageChange(page + 1)
  }

  function handleLimitChange(value: string) {
    const parsed = parseInt(value, 10)
    if (!isNaN(parsed)) onLimitChange(parsed)
  }

  return (
    <div
      role="navigation"
      aria-label="Table pagination"
      className="flex items-center justify-between gap-4 px-1 py-2 text-sm text-muted-foreground"
    >
      {/* Left: total record count */}
      <span className="shrink-0 tabular-nums">
        {isLoading || meta === null ? (
          <span className="inline-block h-4 w-24 animate-pulse rounded bg-muted" />
        ) : (
          <>
            {total.toLocaleString()}{" "}
            {total === 1 ? "customer code" : "customer codes"}
          </>
        )}
      </span>

      {/* Centre: prev / page indicator / next */}
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          onClick={handlePrev}
          disabled={isDisabled || !hasPrev}
          aria-label="Go to previous page"
          className="h-7 px-2"
        >
          <ChevronLeftIcon className="size-4" />
          <span className="hidden sm:inline ml-0.5">Prev</span>
        </Button>

        <span
          aria-live="polite"
          aria-atomic="true"
          className="min-w-[7rem] text-center tabular-nums select-none"
        >
          {isLoading || meta === null ? (
            <span className="inline-block h-4 w-24 animate-pulse rounded bg-muted" />
          ) : (
            <>
              Page{" "}
              <span className="font-medium text-foreground">{page}</span>
              {" "}of{" "}
              <span className="font-medium text-foreground">{totalPages}</span>
            </>
          )}
        </span>

        <Button
          variant="outline"
          size="sm"
          onClick={handleNext}
          disabled={isDisabled || !hasNext}
          aria-label="Go to next page"
          className="h-7 px-2"
        >
          <span className="hidden sm:inline mr-0.5">Next</span>
          <ChevronRightIcon className="size-4" />
        </Button>
      </div>

      {/* Right: page-size selector */}
      <div className="flex items-center gap-1.5 shrink-0">
        <span className="hidden sm:inline text-xs text-muted-foreground">
          Rows per page
        </span>
        <Select
          value={String(limit)}
          onValueChange={handleLimitChange}
          disabled={isDisabled}
        >
          <SelectTrigger
            size="sm"
            className="h-7 w-16"
            aria-label="Rows per page"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="end">
            {PAGE_SIZE_OPTIONS.map((n) => (
              <SelectItem key={n} value={String(n)}>
                {n}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}

/**
 * ImportResultSummary — Read-only post-import result panel for ImportCustomerCodesDialog.
 *
 * Renders the inserted/skipped/total stat grid, optional region context line,
 * and a scrollable error list when row-level errors exist.
 * Contract source: .planning/customer-codes/SPEC.md §4.3.
 */

import type { CustomerCodeImportResult } from "@/types/admin/customer-code"

interface ImportResultSummaryProps {
  result: CustomerCodeImportResult
}

export function ImportResultSummary({ result }: ImportResultSummaryProps) {
  return (
    <div aria-live="polite" className="flex flex-col gap-3">
      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-2 text-center text-sm">
        <div className="rounded-lg border border-border bg-muted/30 px-3 py-2">
          <p className="text-xs text-muted-foreground">Total rows</p>
          <p className="text-lg font-semibold tabular-nums">{result.total_rows}</p>
        </div>
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400">
          <p className="text-xs opacity-80">Inserted</p>
          <p className="text-lg font-semibold tabular-nums">{result.inserted}</p>
        </div>
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-400">
          <p className="text-xs opacity-80">Skipped</p>
          <p className="text-lg font-semibold tabular-nums">{result.skipped}</p>
        </div>
      </div>

      {/* Region context */}
      {result.region_name && (
        <p className="text-xs text-muted-foreground">
          Region:{" "}
          <span className="font-medium text-foreground">{result.region_name}</span>
        </p>
      )}

      {/* Row-level error list */}
      {result.errors.length > 0 && (
        <div className="flex flex-col gap-1">
          <p className="text-xs font-medium text-destructive">
            {result.errors.length} row{result.errors.length > 1 ? "s" : ""} had errors:
          </p>
          <ul className="max-h-32 overflow-y-auto rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive space-y-0.5">
            {result.errors.map((e, i) => (
              <li key={i}>Row {e.row}: {e.message}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

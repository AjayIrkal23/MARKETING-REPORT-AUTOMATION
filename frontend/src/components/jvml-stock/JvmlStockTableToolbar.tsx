/**
 * Toolbar for the JVML Stock List table.
 *
 * One wrapping flex row with exactly the 6 filters:
 *   1. `DatePicker` — single report date (matched exactly against report_date).
 *   2. `<JvmlStockFilters />` — the 5 per-field async-select comboboxes
 *      (Party Code, Order Type, Customer, Sales Office, NCO), plus a trailing "Clear" button.
 *
 * `applyFilter` always merges `page: 1` so the table resets to the first page
 * after any filter change. All state is owned by `useJvmlStockList`; this
 * component is purely presentational and propagates changes via `onQueryChange`.
 */

import { Download } from "lucide-react"

import { DatePicker } from "@/components/common/DatePicker"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { JvmlStockFilters } from "./JvmlStockFilters"
import type { JvmlStockTableToolbarProps } from "@/types/jvml-stock/stock-ui"

export interface ExtendedJvmlStockTableToolbarProps extends JvmlStockTableToolbarProps {
  loading?: boolean
  exporting?: boolean
  onExport?: () => void
}

export function JvmlStockTableToolbar({
  query,
  onQueryChange,
  loading = false,
  exporting = false,
  onExport,
}: ExtendedJvmlStockTableToolbarProps) {
  // Wrap onQueryChange to reset page on every filter change.
  function applyFilter(patch: Parameters<typeof onQueryChange>[0]) {
    onQueryChange({ page: 1, ...patch })
  }

  return (
    <div
      role="toolbar"
      aria-label="JVML stock table filters"
      className="flex flex-wrap items-center gap-2"
    >
      {/* Single report-date filter — exact match on report_date ("dd-MM-yyyy"). */}
      <DatePicker
        value={query.date}
        onChange={(value) => applyFilter({ date: value })}
        placeholder="Report date"
        aria-label="Filter by report date"
        disabled={loading}
        className="shrink-0"
      />

      {/* Inline per-field filters (5 async-select comboboxes) + region. */}
      <JvmlStockFilters
        party_code={query.party_code}
        sales_order_type={query.sales_order_type}
        customer_name={query.customer_name}
        sales_office={query.sales_office}
        nco_declared={query.nco_declared}
        region={query.region}
        disabled={loading}
        onFilterChange={(patch) => applyFilter(patch)}
        onClearAll={() =>
          applyFilter({
            party_code: "",
            sales_order_type: "",
            customer_name: "",
            sales_office: "",
            nco_declared: "",
            region: "",
          })
        }
      />

      {onExport && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onExport}
          disabled={loading || exporting}
          className="h-9 shrink-0 gap-1.5"
          aria-label="Export to Excel"
        >
          {exporting ? <Spinner className="size-3.5" /> : <Download className="size-3.5" />}
          Export
        </Button>
      )}
    </div>
  )
}

/**
 * Toolbar for the JSW Stock List table.
 *
 * One wrapping flex row with exactly the 7 filters:
 *   1. `DatePicker` — single report date (matched exactly against report_date).
 *   2. `<JswStockFilters />` — the 5 per-field async-select comboboxes
 *      (Party Code, Order Type, Customer, Sales Office, NCO) plus region,
 *      plus a trailing "Clear" button.
 *   3. `Export` button — downloads the current filtered view as .xlsx.
 *
 * `applyFilter` always merges `page: 1` so the table resets to the first page
 * after any filter change. All state is owned by `useJswStockList`; this
 * component is purely presentational and propagates changes via `onQueryChange`.
 */

import { DownloadIcon, Loader2Icon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { DatePicker } from "@/components/common/DatePicker"
import { JswStockFilters } from "./JswStockFilters"
import type { JswStockTableToolbarProps } from "@/types/jsw-stock/stock-ui"

export function JswStockTableToolbar({
  query,
  onQueryChange,
  loading = false,
  onExport,
  exporting = false,
}: JswStockTableToolbarProps) {
  // Wrap onQueryChange to reset page on every filter change.
  function applyFilter(patch: Parameters<typeof onQueryChange>[0]) {
    onQueryChange({ page: 1, ...patch })
  }

  return (
    <div
      role="toolbar"
      aria-label="JSW stock table filters"
      className="flex flex-wrap items-center gap-2"
    >
      {/* Single report-date filter — exact match on report_date ("dd-MM-yyyy"). */}
      <DatePicker
        value={query.date}
        onChange={(value) => applyFilter({ date: value })}
        placeholder="Report date"
        disabled={loading}
        aria-label="Filter by report date"
        className="shrink-0"
      />

      {/* Inline per-field filters (5 async-select comboboxes) + region. */}
      <JswStockFilters
        party_code={query.party_code}
        sales_order_type={query.sales_order_type}
        customer_name={query.customer_name}
        sales_office={query.sales_office}
        nco_declared={query.nco_declared}
        region={query.region}
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
        disabled={loading}
      />

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-9 gap-1.5"
        disabled={loading || exporting}
        onClick={onExport}
      >
        {exporting ? (
          <Loader2Icon className="size-4 animate-spin" />
        ) : (
          <DownloadIcon className="size-4" />
        )}
        Export
      </Button>
    </div>
  )
}

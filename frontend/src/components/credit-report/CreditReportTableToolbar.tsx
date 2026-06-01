/**
 * Toolbar for the Credit Report table.
 *
 * A single wrapping flex row renders a `<DatePicker />` (single report-date,
 * exact match on report_date) followed by `<CreditReportFilters />` — the 6 filters:
 *   - 4 async-select comboboxes: Customer Name, City, Customer, CCA Description
 *   - 2 enum Selects: Blocked status + Credit Balance sign
 *   - A trailing "Clear (N)" ghost button when any filter is active
 *
 * NO free-text search box. NO date-range picker (single date only).
 * `onQueryChange` always merges `page: 1` so the table resets to the first page
 * on any filter change. All state is owned by the parent (useCreditReportList).
 */

import { DatePicker } from "@/components/common/DatePicker"
import { CreditReportFilters } from "./CreditReportFilters"
import type { CreditReportTableToolbarProps } from "@/types/credit-report/credit-report-ui"

export function CreditReportTableToolbar({
  query,
  onQueryChange,
}: CreditReportTableToolbarProps) {
  return (
    <div
      role="toolbar"
      aria-label="Credit report table filters"
      className="flex flex-wrap items-center gap-2"
    >
      {/* Single report-date filter — exact match on report_date ("dd-MM-yyyy"). */}
      <DatePicker
        value={query.date}
        onChange={(value) => onQueryChange({ page: 1, date: value })}
        placeholder="Report date"
        aria-label="Filter by report date"
        className="shrink-0"
      />

      <CreditReportFilters
        customer_name={query.customer_name}
        city={query.city}
        customer={query.customer}
        cca_description={query.cca_description}
        blocked={query.blocked}
        credit_balance_sign={query.credit_balance_sign}
        onFilterChange={(patch) => onQueryChange({ page: 1, ...patch })}
        onClearAll={() =>
          onQueryChange({
            page: 1,
            customer_name: "",
            city: "",
            customer: "",
            cca_description: "",
            blocked: "",
            credit_balance_sign: "",
          })
        }
      />
    </div>
  )
}

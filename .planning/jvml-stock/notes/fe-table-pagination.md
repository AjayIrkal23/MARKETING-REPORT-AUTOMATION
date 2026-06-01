# FE Table + Pagination — Builder Notes
# Area: JvmlStockTable.tsx + JvmlStockTablePagination.tsx
# Based on: CustomerCodeTable.tsx, CustomerCodeTablePagination.tsx, AuditLogTable.tsx

---

## 1. Exact import paths (verified against live source)

```ts
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Skeleton }      from "@/components/ui/skeleton"
import { Button }        from "@/components/ui/button"
import { cn }            from "@/lib/utils"
import {
  ArrowUp, ArrowDown, ArrowUpDown, Boxes, AlertCircle,
} from "lucide-react"
import { format, parseISO } from "date-fns"   // for Report Date column
import type { JvmlStockSortBy }      from "@/types/jvml-stock/stock"
import type { JvmlStockTableProps }  from "@/types/jvml-stock/stock-ui"
```

Pagination-only additions:
```ts
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import type { JvmlStockTablePaginationProps } from "@/types/jvml-stock/stock-ui"
import type { PaginationMeta } from "@/types/api/envelope"
```

---

## 2. SortableHead — exact pattern (copy verbatim from CustomerCodeTable)

```tsx
type SortKey = JvmlStockSortBy

interface SortableHeadProps {
  label: string
  col: SortKey
  current: JvmlStockSortBy | undefined
  order: "asc" | "desc" | undefined
  onSort: (col: SortKey) => void
  className?: string
}

function SortableHead({ label, col, current, order, onSort, className }: SortableHeadProps) {
  const active = current === col
  const Icon = active ? (order === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown
  return (
    <TableHead
      className={cn(
        "cursor-pointer select-none whitespace-nowrap hover:text-foreground",
        active ? "text-foreground" : "text-muted-foreground",
        className,
      )}
      onClick={() => onSort(col)}
      aria-sort={active ? (order === "asc" ? "ascending" : "descending") : "none"}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <Icon className={cn("size-3 shrink-0", active ? "opacity-100" : "opacity-40")} aria-hidden />
      </span>
    </TableHead>
  )
}
```

---

## 3. Sort whitelist — which columns get SortableHead vs plain TableHead

SPEC §1 `JvmlStockSortBy` Literal (all 19 allowed keys):
`created_at | report_date | customer | customer_name | party_code | sold_to_party |
ship_to_party | material | jsw_grade | sales_office | so_sales_org | sales_order_type |
distr_chnl | so_product_form | nco_declared | batch | unrestr_qty | stock_quantity | aging`

Table has 12 visible columns. Sort mapping:

| Column label   | field            | SortableHead? | Notes |
|----------------|------------------|---------------|-------|
| Report Date    | `report_date`    | YES           | in whitelist |
| Party Code     | `party_code`     | YES           | in whitelist |
| Customer       | `customer`       | YES           | in whitelist |
| Customer Name  | `customer_name`  | YES           | in whitelist; italic "—" when null |
| Sold To Party  | `sold_to_party`  | YES           | in whitelist |
| Material       | `material`       | YES           | in whitelist |
| JSW Grade      | `jsw_grade`      | YES           | in whitelist |
| Sales Office   | `sales_office`   | YES           | in whitelist |
| Distr.Chnl     | `distr_chnl`     | YES           | in whitelist |
| Unrestr Qty    | `unrestr_qty`    | YES           | in whitelist; tabular-nums |
| Stock Qty      | `stock_quantity` | YES           | in whitelist |
| (actions)      | —                | NO            | `<TableHead className="w-10" />` |

All 11 data columns are in the sort whitelist — use SortableHead for every one; only the
actions column gets a plain narrow TableHead.

---

## 4. Prop interface for JvmlStockTable (define in stock-ui.ts)

```ts
export interface JvmlStockTableProps {
  rows: JvmlStock[]
  /** Named 'loading' (NOT 'isLoading') — mirrors CustomerCodeTable. */
  loading: boolean
  error: string | null
  sortBy: JvmlStockSortBy | undefined
  sortOrder: "asc" | "desc" | undefined
  onSort: (col: JvmlStockSortBy) => void
  onView: (row: JvmlStock) => void
}
```

Note: No onEdit / onDelete — JVML Stock is read-only (view-only action per SPEC §3).

---

## 5. Loading skeleton — exact pattern

```tsx
const SKELETON_ROWS = 8

// skeleton branch (loading === true):
<Table>
  <TableHeader>
    <TableRow>
      {["Report Date","Party Code","Customer","Customer Name",
        "Sold To Party","Material","JSW Grade","Sales Office",
        "Distr.Chnl","Unrestr Qty","Stock Qty",""].map((h) => (
        <TableHead key={h} className="text-muted-foreground">{h}</TableHead>
      ))}
    </TableRow>
  </TableHeader>
  <TableBody>
    {Array.from({ length: SKELETON_ROWS }).map((_, i) => (
      <TableRow key={i}>
        <TableCell><Skeleton className="h-3.5 w-24" /></TableCell>   {/* Report Date */}
        <TableCell><Skeleton className="h-3.5 w-28" /></TableCell>   {/* Party Code */}
        <TableCell><Skeleton className="h-3.5 w-16" /></TableCell>   {/* Customer */}
        <TableCell><Skeleton className="h-3.5 w-40" /></TableCell>   {/* Customer Name */}
        <TableCell><Skeleton className="h-3.5 w-24" /></TableCell>   {/* Sold To Party */}
        <TableCell><Skeleton className="h-3.5 w-28" /></TableCell>   {/* Material */}
        <TableCell><Skeleton className="h-3.5 w-20" /></TableCell>   {/* JSW Grade */}
        <TableCell><Skeleton className="h-3.5 w-24" /></TableCell>   {/* Sales Office */}
        <TableCell><Skeleton className="h-3.5 w-16" /></TableCell>   {/* Distr.Chnl */}
        <TableCell><Skeleton className="h-3.5 w-16" /></TableCell>   {/* Unrestr Qty */}
        <TableCell><Skeleton className="h-3.5 w-16" /></TableCell>   {/* Stock Qty */}
        <TableCell><Skeleton className="size-7 rounded-md" /></TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>
```

---

## 6. Empty state — exact pattern (Boxes icon, per SPEC §3)

```tsx
// empty branch (rows.length === 0):
<div className="flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground">
  <Boxes className="size-8 opacity-40" aria-hidden />
  <p className="text-sm font-medium">No stock rows found</p>
  <p className="text-xs opacity-70">Adjust the filters or wait for the next ingestion.</p>
</div>
```

---

## 7. Error state — exact pattern (AlertCircle, per CustomerCodeTable)

```tsx
// error branch (error !== null):
<div
  role="alert"
  className="flex flex-col items-center justify-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 py-16 text-destructive"
>
  <AlertCircle className="size-8 opacity-70 shrink-0" aria-hidden />
  <p className="text-sm font-medium">Failed to load JVML stock data</p>
  <p className="text-xs text-muted-foreground">{error}</p>
</div>
```

---

## 8. Row click → view pattern (from AuditLogTable)

Row is clickable; Eye button in actions cell stops propagation:

```tsx
<TableRow
  key={row.id}
  className="cursor-pointer"
  onClick={() => onView(row)}
>
  ...
  {/* actions cell */}
  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
    <Button
      variant="ghost"
      size="icon"
      className="size-7"
      aria-label="View stock row details"
      onClick={() => onView(row)}
    >
      <Eye className="size-3.5" aria-hidden />
    </Button>
  </TableCell>
</TableRow>
```

Add `Eye` to lucide imports.

---

## 9. Cell rendering — high-risk columns

```tsx
// Report Date — format dd-mm-yyyy string as readable date
<TableCell className="text-xs text-muted-foreground whitespace-nowrap">
  {row.report_date}
</TableCell>

// Party Code — monospace, zero-padded 10-digit string
<TableCell>
  <span className="font-mono text-xs text-foreground">{row.party_code}</span>
</TableCell>

// Customer — short numeric code (e.g. "8662")
<TableCell className="text-sm text-muted-foreground">{row.customer}</TableCell>

// Customer Name — MAPPED field; italic dash when null
<TableCell className="max-w-[200px]">
  {row.customer_name
    ? <span className="truncate block text-sm text-foreground" title={row.customer_name}>
        {row.customer_name}
      </span>
    : <span className="italic text-muted-foreground opacity-60">—</span>
  }
</TableCell>

// Sold To Party
<TableCell className="text-sm text-muted-foreground">{row.sold_to_party}</TableCell>

// Material — truncate long values
<TableCell className="max-w-[160px]">
  <span className="truncate block text-sm text-muted-foreground" title={row.material ?? undefined}>
    {row.material ?? <span className="opacity-50">—</span>}
  </span>
</TableCell>

// JSW Grade
<TableCell className="text-sm text-muted-foreground">
  {row.jsw_grade ?? <span className="opacity-50">—</span>}
</TableCell>

// Sales Office
<TableCell className="text-sm text-muted-foreground">
  {row.sales_office ?? <span className="opacity-50">—</span>}
</TableCell>

// Distr.Chnl
<TableCell className="text-sm text-muted-foreground">
  {row.distr_chnl ?? <span className="opacity-50">—</span>}
</TableCell>

// Unrestr Qty — number|null, tabular-nums
<TableCell className="text-sm text-right tabular-nums text-foreground">
  {row.unrestr_qty != null
    ? row.unrestr_qty.toLocaleString()
    : <span className="opacity-50 text-muted-foreground">—</span>
  }
</TableCell>

// Stock Qty — number|null, tabular-nums
<TableCell className="text-sm text-right tabular-nums text-foreground">
  {row.stock_quantity != null
    ? row.stock_quantity.toLocaleString()
    : <span className="opacity-50 text-muted-foreground">—</span>
  }
</TableCell>
```

---

## 10. Ready-to-paste JvmlStockTable.tsx (~230 lines, within 250 limit)

```tsx
/**
 * JvmlStockTable — server-driven sortable table for the JVML Stock List screen.
 * Columns: Report Date · Party Code · Customer · Customer Name (italic "—" when null) ·
 *          Sold To Party · Material · JSW Grade · Sales Office · Distr.Chnl ·
 *          Unrestr Qty (tabular-nums) · Stock Qty · view-action.
 * Loading: 8 skeleton rows. Empty state: Boxes icon. Error state: AlertCircle.
 * No client-side filtering — all sort state driven by parent via props.
 * Contract source: .planning/jvml-stock/SPEC.md §3.
 * Props: JvmlStockTableProps in types/jvml-stock/stock-ui.ts.
 */
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Skeleton }  from "@/components/ui/skeleton"
import { Button }    from "@/components/ui/button"
import { cn }        from "@/lib/utils"
import {
  ArrowUp, ArrowDown, ArrowUpDown, Boxes, AlertCircle, Eye,
} from "lucide-react"
import type { JvmlStockSortBy } from "@/types/jvml-stock/stock"
import type { JvmlStockTableProps } from "@/types/jvml-stock/stock-ui"

const SKELETON_ROWS = 8

interface SortableHeadProps {
  label: string
  col: JvmlStockSortBy
  current: JvmlStockSortBy | undefined
  order: "asc" | "desc" | undefined
  onSort: (col: JvmlStockSortBy) => void
  className?: string
}

function SortableHead({ label, col, current, order, onSort, className }: SortableHeadProps) {
  const active = current === col
  const Icon = active ? (order === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown
  return (
    <TableHead
      className={cn(
        "cursor-pointer select-none whitespace-nowrap hover:text-foreground",
        active ? "text-foreground" : "text-muted-foreground",
        className,
      )}
      onClick={() => onSort(col)}
      aria-sort={active ? (order === "asc" ? "ascending" : "descending") : "none"}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <Icon className={cn("size-3 shrink-0", active ? "opacity-100" : "opacity-40")} aria-hidden />
      </span>
    </TableHead>
  )
}

export function JvmlStockTable({
  rows, loading, error, sortBy, sortOrder, onSort, onView,
}: JvmlStockTableProps) {

  if (loading) {
    return (
      <Table>
        <TableHeader>
          <TableRow>
            {["Report Date","Party Code","Customer","Customer Name",
              "Sold To Party","Material","JSW Grade","Sales Office",
              "Distr.Chnl","Unrestr Qty","Stock Qty",""].map((h) => (
              <TableHead key={h} className="text-muted-foreground">{h}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: SKELETON_ROWS }).map((_, i) => (
            <TableRow key={i}>
              <TableCell><Skeleton className="h-3.5 w-24" /></TableCell>
              <TableCell><Skeleton className="h-3.5 w-28" /></TableCell>
              <TableCell><Skeleton className="h-3.5 w-16" /></TableCell>
              <TableCell><Skeleton className="h-3.5 w-40" /></TableCell>
              <TableCell><Skeleton className="h-3.5 w-24" /></TableCell>
              <TableCell><Skeleton className="h-3.5 w-28" /></TableCell>
              <TableCell><Skeleton className="h-3.5 w-20" /></TableCell>
              <TableCell><Skeleton className="h-3.5 w-24" /></TableCell>
              <TableCell><Skeleton className="h-3.5 w-16" /></TableCell>
              <TableCell><Skeleton className="h-3.5 w-16" /></TableCell>
              <TableCell><Skeleton className="h-3.5 w-16" /></TableCell>
              <TableCell><Skeleton className="size-7 rounded-md" /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    )
  }

  if (error) {
    return (
      <div
        role="alert"
        className="flex flex-col items-center justify-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 py-16 text-destructive"
      >
        <AlertCircle className="size-8 opacity-70 shrink-0" aria-hidden />
        <p className="text-sm font-medium">Failed to load JVML stock data</p>
        <p className="text-xs text-muted-foreground">{error}</p>
      </div>
    )
  }

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground">
        <Boxes className="size-8 opacity-40" aria-hidden />
        <p className="text-sm font-medium">No stock rows found</p>
        <p className="text-xs opacity-70">Adjust the filters or wait for the next ingestion.</p>
      </div>
    )
  }

  const sortProps = { current: sortBy, order: sortOrder, onSort }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <SortableHead label="Report Date"    col="report_date"    {...sortProps} className="min-w-[110px]" />
          <SortableHead label="Party Code"     col="party_code"     {...sortProps} className="min-w-[120px]" />
          <SortableHead label="Customer"       col="customer"       {...sortProps} />
          <SortableHead label="Customer Name"  col="customer_name"  {...sortProps} className="min-w-[160px]" />
          <SortableHead label="Sold To Party"  col="sold_to_party"  {...sortProps} className="min-w-[120px]" />
          <SortableHead label="Material"       col="material"       {...sortProps} className="min-w-[140px]" />
          <SortableHead label="JSW Grade"      col="jsw_grade"      {...sortProps} className="min-w-[100px]" />
          <SortableHead label="Sales Office"   col="sales_office"   {...sortProps} className="min-w-[110px]" />
          <SortableHead label="Distr.Chnl"     col="distr_chnl"     {...sortProps} />
          <SortableHead label="Unrestr Qty"    col="unrestr_qty"    {...sortProps} className="text-right" />
          <SortableHead label="Stock Qty"      col="stock_quantity" {...sortProps} className="text-right" />
          <TableHead className="w-10" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.id} className="cursor-pointer" onClick={() => onView(row)}>
            <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
              {row.report_date}
            </TableCell>
            <TableCell>
              <span className="font-mono text-xs text-foreground">{row.party_code}</span>
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {row.customer ?? <span className="opacity-50">—</span>}
            </TableCell>
            <TableCell className="max-w-[200px]">
              {row.customer_name
                ? <span className="truncate block text-sm text-foreground" title={row.customer_name}>
                    {row.customer_name}
                  </span>
                : <span className="italic text-muted-foreground opacity-60">—</span>
              }
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {row.sold_to_party ?? <span className="opacity-50">—</span>}
            </TableCell>
            <TableCell className="max-w-[160px]">
              <span className="truncate block text-sm text-muted-foreground" title={row.material ?? undefined}>
                {row.material ?? <span className="opacity-50">—</span>}
              </span>
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {row.jsw_grade ?? <span className="opacity-50">—</span>}
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {row.sales_office ?? <span className="opacity-50">—</span>}
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {row.distr_chnl ?? <span className="opacity-50">—</span>}
            </TableCell>
            <TableCell className="text-sm text-right tabular-nums text-foreground">
              {row.unrestr_qty != null
                ? row.unrestr_qty.toLocaleString()
                : <span className="opacity-50 text-muted-foreground">—</span>
              }
            </TableCell>
            <TableCell className="text-sm text-right tabular-nums text-foreground">
              {row.stock_quantity != null
                ? row.stock_quantity.toLocaleString()
                : <span className="opacity-50 text-muted-foreground">—</span>
              }
            </TableCell>
            <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                aria-label="View stock row details"
                onClick={() => onView(row)}
              >
                <Eye className="size-3.5" aria-hidden />
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
```

---

## 11. Ready-to-paste JvmlStockTablePagination.tsx (~110 lines)

```tsx
/**
 * JvmlStockTablePagination — purely presentational pagination bar.
 * Props: JvmlStockTablePaginationProps (types/jvml-stock/stock-ui.ts).
 * Prop is `isLoading` (NOT `loading`) — mirrors CustomerCodeTablePagination.
 * Label: "stock row" / "stock rows".
 * Renders: [← Prev]  Page X of N · N total  [page-size Select]  [Next →]
 */
import type { JvmlStockTablePaginationProps } from "@/types/jvml-stock/stock-ui"
import { Button } from "@/components/ui/button"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"

const PAGE_SIZE_OPTIONS = [10, 20, 50] as const

export function JvmlStockTablePagination({
  meta,
  isLoading,
  onPageChange,
  onLimitChange,
}: JvmlStockTablePaginationProps) {
  const page       = meta?.page       ?? 1
  const totalPages = meta?.totalPages ?? 1
  const total      = meta?.total      ?? 0
  const limit      = meta?.limit      ?? 20

  const isDisabled = isLoading || meta === null
  const hasPrev    = page > 1
  const hasNext    = page < totalPages

  function handlePrev()  { if (hasPrev) onPageChange(page - 1) }
  function handleNext()  { if (hasNext) onPageChange(page + 1) }
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
      <span className="shrink-0 tabular-nums">
        {isLoading || meta === null ? (
          <span className="inline-block h-4 w-24 animate-pulse rounded bg-muted" />
        ) : (
          <>{total.toLocaleString()}{" "}{total === 1 ? "stock row" : "stock rows"}</>
        )}
      </span>

      <div className="flex items-center gap-1">
        <Button variant="outline" size="sm" onClick={handlePrev}
          disabled={isDisabled || !hasPrev} aria-label="Go to previous page" className="h-7 px-2">
          <ChevronLeftIcon className="size-4" />
          <span className="hidden sm:inline ml-0.5">Prev</span>
        </Button>

        <span aria-live="polite" aria-atomic="true"
          className="min-w-[7rem] text-center tabular-nums select-none">
          {isLoading || meta === null ? (
            <span className="inline-block h-4 w-24 animate-pulse rounded bg-muted" />
          ) : (
            <>Page{" "}<span className="font-medium text-foreground">{page}</span>
            {" "}of{" "}<span className="font-medium text-foreground">{totalPages}</span></>
          )}
        </span>

        <Button variant="outline" size="sm" onClick={handleNext}
          disabled={isDisabled || !hasNext} aria-label="Go to next page" className="h-7 px-2">
          <span className="hidden sm:inline mr-0.5">Next</span>
          <ChevronRightIcon className="size-4" />
        </Button>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <span className="hidden sm:inline text-xs text-muted-foreground">Rows per page</span>
        <Select value={String(limit)} onValueChange={handleLimitChange} disabled={isDisabled}>
          <SelectTrigger size="sm" className="h-7 w-16" aria-label="Rows per page">
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="end">
            {PAGE_SIZE_OPTIONS.map((n) => (
              <SelectItem key={n} value={String(n)}>{n}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
```

---

## 12. Prop interface for JvmlStockTablePaginationProps (add to stock-ui.ts)

```ts
export interface JvmlStockTablePaginationProps {
  meta: PaginationMeta | null
  /** Named 'isLoading' (NOT 'loading') — mirrors CustomerCodeTablePagination. */
  isLoading: boolean
  onPageChange: (page: number) => void
  onLimitChange: (limit: number) => void
}
```

---

## 13. SPEC mismatches / discrepancies found

**NONE — no contradictions detected.** All patterns are consistent:

- SPEC §3 specifies `Boxes` icon for empty state — confirmed not present in CustomerCodeTable
  (which uses `Building2`), so Boxes is JVML-specific and correct per SPEC.
- SPEC §3 specifies `isLoading` for pagination prop — confirmed matches CustomerCodeTablePagination
  (which also uses `isLoading`). CustomerCodeTable uses `loading` (NOT `isLoading`) for the table
  prop — SPEC stock-ui.ts mirror confirms `table prop = loading`, `pagination prop = isLoading`.
  Builder MUST keep this split or TypeScript will fail.
- SPEC says "Customer Name (italic — when null)" — reference code uses
  `<span className="italic opacity-60">—</span>` pattern (seen in region_name null handling
  in CustomerCodeTable). Pattern confirmed safe.
- SPEC column order: Report Date · Party Code · Customer · Customer Name · Sold To Party ·
  Material · JSW Grade · Sales Office · Distr.Chnl · Unrestr Qty · Stock Qty. All 11 data
  columns are in `JvmlStockSortBy` whitelist — confirmed above in §3.

---

## 14. Files the builder will create

1. `frontend/src/components/jvml-stock/JvmlStockTable.tsx` — table component (~230 lines)
2. `frontend/src/components/jvml-stock/JvmlStockTablePagination.tsx` — pagination bar (~110 lines)
3. `frontend/src/types/jvml-stock/stock-ui.ts` — must include `JvmlStockTableProps` and
   `JvmlStockTablePaginationProps` interfaces (among others per SPEC §3 types)

The types file is shared with other FE area builders (toolbar, filters, hook, page).
The builder for this area owns the Table/Pagination prop interfaces; other prop shapes
(toolbar, filters, sheet, hook result) are owned by their respective area builders.

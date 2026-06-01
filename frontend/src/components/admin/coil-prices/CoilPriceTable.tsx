/**
 * CoilPriceTable — compact server-driven table for the Per Coil Price section.
 *
 * Renders four states: loading (skeleton rows), error, empty, and data. Each
 * data row exposes inline edit/delete icon actions. INR display uses the
 * en-IN locale. Prop contract: CoilPriceTableProps from coil-price-ui.ts.
 */

import { Pencil, Trash2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { CoilPriceTableProps } from "@/types/admin/coil-price-ui"

const SKELETON_ROWS = 4

function formatQuantity(value: number): string {
  return value.toLocaleString("en-IN", { maximumFractionDigits: 3 })
}

function formatPrice(value: number): string {
  return `₹ ${value.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`
}

export function CoilPriceTable({ rows, loading, error, onEdit, onDelete }: CoilPriceTableProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40 hover:bg-muted/40">
            <TableHead className="h-9">Quantity</TableHead>
            <TableHead className="h-9">Price</TableHead>
            <TableHead className="h-9 w-[88px] text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            Array.from({ length: SKELETON_ROWS }).map((_, i) => (
              <TableRow key={`sk-${i}`}>
                <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                <TableCell className="text-right"><Skeleton className="ml-auto h-4 w-12" /></TableCell>
              </TableRow>
            ))
          ) : error ? (
            <TableRow>
              <TableCell colSpan={3} className="py-8 text-center text-sm text-destructive">
                {error}
              </TableCell>
            </TableRow>
          ) : rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={3} className="py-8 text-center text-sm text-muted-foreground">
                No coil prices yet. Add the first one to get started.
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row) => (
              <TableRow key={row.id} className={row.active ? undefined : "opacity-60"}>
                <TableCell className="font-medium tabular-nums">
                  <span className="flex items-center gap-2">
                    {formatQuantity(row.quantity)}
                    {!row.active && (
                      <Badge
                        variant="outline"
                        className="h-4 px-1.5 text-[10px] font-normal text-muted-foreground"
                      >
                        Inactive
                      </Badge>
                    )}
                  </span>
                </TableCell>
                <TableCell className="tabular-nums">{formatPrice(row.price)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Edit coil price for quantity ${row.quantity}`}
                      onClick={() => onEdit(row)}
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-muted-foreground hover:text-destructive"
                      aria-label={`Delete coil price for quantity ${row.quantity}`}
                      onClick={() => onDelete(row)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}

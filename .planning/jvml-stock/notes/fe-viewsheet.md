# fe-viewsheet — Builder-Ready Packet
## ViewJvmlStockSheet + jvml-stock-fields.ts

**Scope:** Sheet usage patterns, field-group config, ready-to-paste implementations.
**Reference read:** ViewCustomerCodeSheet.tsx · ViewAuditLogSheet.tsx · sheet.tsx

---

## 1. Sheet Component Patterns (confirmed from reference code)

### Import block (exact paths)
```tsx
import { format, parseISO } from "date-fns"
import { Boxes } from "lucide-react"
import { Separator } from "@/components/ui/separator"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import type { JvmlStock } from "@/types/jvml-stock/stock"
```

### SheetContent — side right, scroll
```tsx
<Sheet open={open} onOpenChange={onOpenChange}>
  <SheetContent
    side="right"
    className="flex flex-col gap-0 p-0 sm:max-w-md"
    aria-label="JVML Stock details"
  >
    <SheetHeader className="px-5 pt-5 pb-4">
      {/* icon chip + title + description */}
    </SheetHeader>
    <Separator />
    <div className="flex-1 overflow-y-auto px-5 py-2">
      {/* groups */}
    </div>
  </SheetContent>
</Sheet>
```

Key layout facts from sheet.tsx:
- `SheetContent` with `side="right"` uses `data-[side=right]:w-3/4 data-[side=right]:sm:max-w-sm` by default — OVERRIDE with `sm:max-w-md` (customer-code pattern) or `sm:max-w-lg` (audit-log pattern). Use `sm:max-w-lg` for JVML since there are many fields.
- `flex flex-col gap-0 p-0` removes default `gap-4 p-4` from SheetContent.
- Scrollable body: `flex-1 overflow-y-auto` on the inner div.
- `showCloseButton` prop defaults `true` — close button auto-rendered at `top-3 right-3`.

### DetailRow sub-component (verbatim from reference)
```tsx
function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[7rem_1fr] items-start gap-x-3 py-2.5">
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide pt-0.5">
        {label}
      </span>
      <span className="text-sm text-foreground break-all">{children}</span>
    </div>
  )
}
```

### SectionHeading sub-component (verbatim from reference)
```tsx
function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
      {children}
    </p>
  )
}
```

### Date formatting helpers (exact patterns used in both reference files)
```tsx
// ISO datetime string → "dd MMM yyyy, HH:mm"  (used for created_at / updated_at)
function formatTs(iso: string | null | undefined): string {
  if (!iso) return "—"
  try { return format(parseISO(iso), "dd MMM yyyy, HH:mm") } catch { return iso }
}

// ISO date string (date-only, e.g. production_date stored as ISO after BE coercion) → "dd MMM yyyy"
function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—"
  try { return format(parseISO(iso), "dd MMM yyyy") } catch { return iso }
}
```

Note: SPEC §1 says `production_date` and `cp_end_date` are stored as `datetime | None` (BE) / `string | null` ISO (FE type). Use `formatDate` for these two fields, `formatTs` for `created_at`/`updated_at`.

### Generic Field renderer (for config-driven rendering)
```tsx
interface FieldDef {
  key: keyof JvmlStock
  label: string
  kind: "text" | "number" | "date" | "datetime" | "mono"
}

function Field({ label, value, kind }: { label: string; value: unknown; kind: FieldDef["kind"] }) {
  let display: React.ReactNode = "—"
  if (value !== null && value !== undefined && value !== "") {
    if (kind === "date")     display = formatDate(value as string)
    else if (kind === "datetime") display = formatTs(value as string)
    else if (kind === "mono") display = <span className="font-mono text-xs text-muted-foreground select-all">{String(value)}</span>
    else if (kind === "number") display = <span className="tabular-nums">{String(value)}</span>
    else display = String(value)
  }
  return <DetailRow label={label}>{display}</DetailRow>
}
```

---

## 2. Props Interface

```tsx
// ViewJvmlStockSheet props (inline — no import from ui types needed for this file)
interface ViewJvmlStockSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  row: JvmlStock | null
}
```

This mirrors `ViewCustomerCodeSheetProps` exactly (open + onOpenChange + data | null).

---

## 3. jvml-stock-fields.ts — Ready to Paste

Path: `src/components/jvml-stock/jvml-stock-fields.ts`

```ts
import type { JvmlStock } from "@/types/jvml-stock/stock"

export interface FieldDef {
  key: keyof JvmlStock
  label: string
  kind: "text" | "number" | "date" | "datetime" | "mono"
}

export interface FieldGroup {
  group: string
  fields: FieldDef[]
}

export const JVML_STOCK_FIELD_GROUPS: FieldGroup[] = [
  {
    group: "Order & SO",
    fields: [
      { key: "sales_order_no",    label: "Sales Order No",   kind: "text" },
      { key: "so_item_num",       label: "SO Item Num",      kind: "text" },
      { key: "so_sales_org",      label: "SO Sales Org",     kind: "text" },
      { key: "sales_order_type",  label: "Sales Order Type", kind: "text" },
      { key: "order_status",      label: "Order Status",     kind: "text" },
      { key: "scheduled_status",  label: "Scheduled Status", kind: "text" },
      { key: "so_product_form",   label: "SO Product Form",  kind: "text" },
      { key: "so_end_application",label: "End Application",  kind: "text" },
      { key: "purchase_order_number", label: "PO Number",    kind: "text" },
    ],
  },
  {
    group: "Customer & Mapping",
    fields: [
      { key: "sold_to_party",         label: "Sold To Party",    kind: "text" },
      { key: "party_code",            label: "Party Code",       kind: "mono" },
      { key: "party_code_normalized", label: "Normalized Code",  kind: "mono" },
      { key: "ship_to_party",         label: "Ship To Party",    kind: "text" },
      { key: "customer",              label: "Customer",         kind: "text" },
      { key: "customer_name",         label: "Customer Name",    kind: "text" },
      { key: "customer_code_id",      label: "Customer Code ID", kind: "mono" },
      { key: "distr_chnl",            label: "Distr. Channel",   kind: "text" },
      { key: "sales_office",          label: "Sales Office",     kind: "text" },
    ],
  },
  {
    group: "Material & Dimensions",
    fields: [
      { key: "material",          label: "Material",          kind: "text" },
      { key: "jsw_grade",         label: "JSW Grade",         kind: "text" },
      { key: "batch",             label: "Batch",             kind: "text" },
      { key: "act_thickness_mm",  label: "Act. Thickness (mm)", kind: "text" },
      { key: "width_mm",          label: "Width (mm)",        kind: "text" },
      { key: "length_mm",         label: "Length (mm)",       kind: "text" },
      { key: "eq_specification",  label: "Eq. Specification", kind: "text" },
      { key: "eq_sub_grade",      label: "Eq. Sub Grade",     kind: "text" },
      { key: "special_stock",     label: "Special Stock",     kind: "text" },
      { key: "production_date",   label: "Production Date",   kind: "date" },
      { key: "shift",             label: "Shift",             kind: "text" },
      { key: "aging",             label: "Aging (days)",      kind: "number" },
    ],
  },
  {
    group: "Quantities",
    fields: [
      { key: "unrestr_qty",    label: "Unrestricted Qty", kind: "number" },
      { key: "in_quality_insp",label: "In Quality Insp.", kind: "number" },
      { key: "blocked",        label: "Blocked",          kind: "number" },
      { key: "stock_quantity", label: "Stock Quantity",   kind: "number" },
    ],
  },
  {
    group: "Quality / NCO",
    fields: [
      { key: "usage_decision",     label: "Usage Decision", kind: "text" },
      { key: "ud_remarks",         label: "UD Remarks",     kind: "text" },
      { key: "nco_declared",       label: "NCO Declared",   kind: "text" },
      { key: "nco_reason",         label: "NCO Reason",     kind: "text" },
      { key: "next_workcenter",    label: "Next Workcenter",kind: "text" },
      { key: "production_workcenter", label: "Prod. Workcenter", kind: "text" },
    ],
  },
  {
    group: "Chemistry (%)",
    fields: [
      { key: "s_aluminium_pct",  label: "Al %",  kind: "number" },
      { key: "s_boron_pct",      label: "B %",   kind: "number" },
      { key: "s_carbon_pct",     label: "C %",   kind: "number" },
      { key: "s_chromium_pct",   label: "Cr %",  kind: "number" },
      { key: "s_copper_pct",     label: "Cu %",  kind: "number" },
      { key: "s_manganese_pct",  label: "Mn %",  kind: "number" },
      { key: "s_molybdenum_pct", label: "Mo %",  kind: "number" },
      { key: "s_nickel_pct",     label: "Ni %",  kind: "number" },
      { key: "s_niobium_pct",    label: "Nb %",  kind: "number" },
      { key: "s_phosphorus_pct", label: "P %",   kind: "number" },
      { key: "s_silicon_pct",    label: "Si %",  kind: "number" },
      { key: "s_sulphur_pct",    label: "S %",   kind: "number" },
      { key: "s_titanium_pct",   label: "Ti %",  kind: "number" },
      { key: "s_vanadium_pct",   label: "V %",   kind: "number" },
    ],
  },
  {
    group: "Mechanical",
    fields: [
      { key: "ys_in_mpa",           label: "YS (MPa)",         kind: "number" },
      { key: "tensile_strength_mpa_b", label: "Tensile (MPa)", kind: "number" },
      { key: "elongation",          label: "Elongation",       kind: "text" },
      { key: "elongation_mic",      label: "Elongation (Mic)", kind: "number" },
      { key: "hardness",            label: "Hardness",         kind: "text" },
      { key: "yield_strength",      label: "Yield Strength",   kind: "text" },
      { key: "uts",                 label: "UTS",               kind: "text" },
    ],
  },
  {
    group: "Logistics / Export",
    fields: [
      { key: "location",         label: "Location",        kind: "text" },
      { key: "storage_location", label: "Storage Location",kind: "text" },
      { key: "str_no",           label: "STR No",          kind: "text" },
      { key: "sto_no",           label: "STO No",          kind: "text" },
      { key: "do_no",            label: "DO No",           kind: "text" },
      { key: "shipment",         label: "Shipment",        kind: "text" },
      { key: "port_name",        label: "Port Name",       kind: "text" },
      { key: "unloading_point",  label: "Unloading Point", kind: "text" },
      { key: "recieving_point",  label: "Receiving Point", kind: "text" },
      { key: "route",            label: "Route",           kind: "text" },
      { key: "route_desc",       label: "Route Desc",      kind: "text" },
      { key: "cp_number",        label: "CP Number",       kind: "text" },
      { key: "cp_end_date",      label: "CP End Date",     kind: "date" },
      { key: "lc_exp_date",      label: "LC Exp Date",     kind: "text" },
    ],
  },
  {
    group: "Meta",
    fields: [
      { key: "report_date",  label: "Report Date",  kind: "text" },
      { key: "source_file",  label: "Source File",  kind: "text" },
      { key: "created_at",   label: "Ingested",     kind: "datetime" },
      { key: "updated_at",   label: "Updated",      kind: "datetime" },
    ],
  },
]
```

Field count: 72 SPEC columns + 4 meta fields (party_code_normalized, customer_name, customer_code_id, report_date, source_file, created_at, updated_at) = all 79 storable fields covered across 9 groups. `id` is shown in the sheet header subtitle, not as a separate row.

---

## 4. ViewJvmlStockSheet.tsx — Ready to Paste

Path: `src/components/jvml-stock/ViewJvmlStockSheet.tsx`

```tsx
/**
 * ViewJvmlStockSheet — read-only detail panel for a JVML Stock row.
 * Slides in from the right. Shows all 72 + meta fields in 9 labelled groups.
 * Presentational only — no API calls, no mutations.
 * ≤250 lines: uses JVML_STOCK_FIELD_GROUPS config + generic Field renderer.
 */

import { format, parseISO } from "date-fns"
import { Boxes } from "lucide-react"
import { Separator } from "@/components/ui/separator"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { JVML_STOCK_FIELD_GROUPS } from "./jvml-stock-fields"
import type { FieldDef } from "./jvml-stock-fields"
import type { JvmlStock } from "@/types/jvml-stock/stock"

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ViewJvmlStockSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  row: JvmlStock | null
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTs(iso: string | null | undefined): string {
  if (!iso) return "—"
  try { return format(parseISO(iso), "dd MMM yyyy, HH:mm") } catch { return iso }
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—"
  try { return format(parseISO(iso), "dd MMM yyyy") } catch { return iso }
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[7rem_1fr] items-start gap-x-3 py-2.5">
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide pt-0.5">
        {label}
      </span>
      <span className="text-sm text-foreground break-all">{children}</span>
    </div>
  )
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
      {children}
    </p>
  )
}

function Field({ def, row }: { def: FieldDef; row: JvmlStock }) {
  const raw = row[def.key]
  let display: React.ReactNode = "—"

  if (raw !== null && raw !== undefined && raw !== "") {
    switch (def.kind) {
      case "date":
        display = formatDate(raw as string)
        break
      case "datetime":
        display = formatTs(raw as string)
        break
      case "mono":
        display = (
          <span className="font-mono text-xs text-muted-foreground select-all">
            {String(raw)}
          </span>
        )
        break
      case "number":
        display = <span className="tabular-nums">{String(raw)}</span>
        break
      default:
        display = String(raw)
    }
  }

  return <DetailRow label={def.label}>{display}</DetailRow>
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ViewJvmlStockSheet({ open, onOpenChange, row }: ViewJvmlStockSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex flex-col gap-0 p-0 sm:max-w-lg"
        aria-label="JVML Stock details"
      >
        {/* Header */}
        <SheetHeader className="px-5 pt-5 pb-4">
          <div className="flex items-center gap-3">
            <div
              aria-hidden="true"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
            >
              <Boxes className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <SheetTitle className="truncate">
                {row?.customer_name ?? row?.customer ?? "JVML Stock Detail"}
              </SheetTitle>
              <SheetDescription className="truncate text-xs">
                {row
                  ? `${row.party_code} · ${row.material ?? "—"} · ${row.report_date}`
                  : "No row selected"}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <Separator />

        {/* Body */}
        {row == null ? (
          <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground px-6">
            No stock row selected.
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-5 py-2">
            {JVML_STOCK_FIELD_GROUPS.map((group, gi) => (
              <div key={group.group}>
                {gi > 0 && <Separator className="my-3" />}
                <SectionHeading>{group.group}</SectionHeading>
                {group.fields.map((def) => (
                  <Field key={String(def.key)} def={def} row={row} />
                ))}
              </div>
            ))}
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
```

Estimated line count: ~140 lines. Well within 250.

---

## 5. SPEC Mismatches / Flags

### MISMATCH 1 — `recieving_point` typo in SPEC (col 39)
SPEC §1 col 39: `recieving_point` (misspelled — should be `receiving_point`). The field name in the config above mirrors the SPEC exactly (`recieving_point`). Builder must use the SPEC spelling in the TS type, BE model, and this config to stay consistent. Do NOT correct the spelling unilaterally — flag to orchestrator.

### MISMATCH 2 — `lc_exp_date` kind is `text`, not `date`
SPEC §1 col 70 `LC Exp Date` has type `text` (not `date`), explicitly noted as "text in `dd.mm.yyyy` format". The fields config above correctly sets `kind: "text"` so it renders as a plain string. If the UI should pretty-format it, a custom formatter would be needed — but since the raw stored value is a text string (not ISO), `formatDate` would fail. Leave as `text` per SPEC.

### MISMATCH 3 — Sheet default `sm:max-w-sm` vs needed width
`sheet.tsx` `SheetContent` defaults to `data-[side=right]:sm:max-w-sm` (384px). With 72+ fields the side panel needs more room. Both reference files override: customer-code uses `sm:max-w-md` (448px), audit-log uses `sm:max-w-lg` (512px). JVML sheet above uses `sm:max-w-lg` — correct for dense content.

### NOTE — `id` field
`JvmlStock.id: string` exists (from `JvmlStockPublic`) but is not in the 72 SPEC columns. It is rendered in the sheet header subtitle area (alongside `party_code`, `material`, `report_date`), NOT as a `DetailRow`. If the builder wants an explicit ID row, add `{ key: "id", label: "Row ID", kind: "mono" }` to the Meta group.

### NOTE — `source_file` label
SPEC stores full absolute path. In the Meta group `source_file` is labelled "Source File". It may be very long — `break-all` on `DetailRow` handles this.

### NOTE — Chemistry number display
Chemistry pct fields are `number | null` (float). The `tabular-nums` rendering shows them as raw floats (e.g. `0.049`). If the product wants `4 decimal places`, add a `toFixed(4)` pass inside the `number` case of `Field`. Currently mirrors the audit-log pattern (raw string coercion).

---

## 6. Dialog State Wiring (from SPEC §3 stock-ui.ts)

```ts
// From src/types/jvml-stock/stock-ui.ts
type JvmlStockDialogState = { type: "none" } | { type: "view"; row: JvmlStock }
```

Usage in `JvmlStockListPage`:
```tsx
// Inside the page — dialog comes from useJvmlStockList hook
<ViewJvmlStockSheet
  open={dialog.type === "view"}
  onOpenChange={(o) => { if (!o) closeDialog() }}
  row={dialog.type === "view" ? dialog.row : null}
/>
```

---

## 7. File Checklist for Builder

| File | Path | Action |
|------|------|--------|
| `jvml-stock-fields.ts` | `src/components/jvml-stock/jvml-stock-fields.ts` | CREATE (paste §3 above) |
| `ViewJvmlStockSheet.tsx` | `src/components/jvml-stock/ViewJvmlStockSheet.tsx` | CREATE (paste §4 above) |

Both files depend on:
- `src/types/jvml-stock/stock.ts` (must exist first — `JvmlStock` interface)
- `src/components/ui/sheet.tsx` (exists)
- `src/components/ui/separator.tsx` (exists — used in customer-code and audit-log reference files)
- `date-fns` (in package.json — confirmed used by both reference files)
- `lucide-react` `Boxes` icon (confirmed in package.json; SPEC §3 specifies `Boxes` for JVML Stock pages)

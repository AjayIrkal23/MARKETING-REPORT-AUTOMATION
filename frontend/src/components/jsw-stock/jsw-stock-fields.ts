/**
 * jsw-stock-fields.ts
 *
 * Data-only config (NO React imports) driving ViewJswStockDialog.
 * Covers all 79 fields (72 source + 7 meta) in 9 logical groups.
 *
 * kind values:
 *   "text"     — string | null, render as-is
 *   "number"   — number | null, toLocaleString
 *   "date"     — ISO date string | null, format as date only
 *   "datetime" — ISO datetime string | null, format with time
 */

import type { JswStock } from "@/types/jsw-stock/stock"

export interface StockFieldDef {
  key: keyof JswStock
  label: string
  kind: "text" | "number" | "date" | "datetime"
}

export interface FieldGroup {
  title: string
  fields: StockFieldDef[]
}

export const FIELD_GROUPS: FieldGroup[] = [
  {
    title: "Order & SO",
    fields: [
      { key: "so_sales_org",        label: "SO Sales Org",       kind: "text" },
      { key: "sales_order_type",    label: "Sales Order Type",   kind: "text" },
      { key: "distr_chnl",          label: "Distr. Channel",     kind: "text" },
      { key: "sales_order_no",      label: "Sales Order No.",    kind: "text" },
      { key: "so_item_num",         label: "SO Item Num",        kind: "text" },
      { key: "order_status",        label: "Order Status",       kind: "text" },
      { key: "so_product_form",     label: "SO Product Form",    kind: "text" },
      { key: "so_end_application",  label: "SO End Application", kind: "text" },
      { key: "scheduled_status",    label: "Scheduled Status",   kind: "text" },
      { key: "report_date",         label: "Report Date",        kind: "text" },
    ],
  },
  {
    title: "Customer & Mapping",
    fields: [
      { key: "sold_to_party",         label: "Sold To Party",    kind: "text" },
      { key: "party_code",            label: "Party Code",       kind: "text" },
      { key: "ship_to_party",         label: "Ship To Party",    kind: "text" },
      { key: "customer",              label: "Customer",         kind: "text" },
      { key: "sales_office",          label: "Sales Office",     kind: "text" },
      { key: "customer_name",         label: "Customer Name",    kind: "text" },
      { key: "party_code_normalized", label: "Normalized Code",  kind: "text" },
      { key: "customer_code_id",      label: "Customer Code ID", kind: "text" },
    ],
  },
  {
    title: "Material & Dimensions",
    fields: [
      { key: "material",          label: "Material",            kind: "text" },
      { key: "jsw_grade",         label: "JSW Grade",           kind: "text" },
      { key: "batch",             label: "Batch",               kind: "text" },
      { key: "act_thickness_mm",  label: "Act. Thickness (mm)", kind: "text" },
      { key: "width_mm",          label: "Width (mm)",          kind: "text" },
      { key: "length_mm",         label: "Length (mm)",         kind: "text" },
      { key: "special_stock",     label: "Special Stock",       kind: "text" },
      { key: "eq_specification",  label: "Eq. Specification",   kind: "text" },
      { key: "eq_sub_grade",      label: "Eq. Sub Grade",       kind: "text" },
    ],
  },
  {
    title: "Quantities (MT)",
    fields: [
      { key: "unrestr_qty",     label: "Unrestr. Qty",    kind: "number" },
      { key: "in_quality_insp", label: "In Quality Insp", kind: "number" },
      { key: "blocked",         label: "Blocked",         kind: "number" },
      { key: "stock_quantity",  label: "Stock Quantity",  kind: "number" },
      { key: "aging",           label: "Aging",           kind: "number" },
    ],
  },
  {
    title: "Quality / NCO",
    fields: [
      { key: "usage_decision",       label: "Usage Decision",   kind: "text"     },
      { key: "nco_declared",         label: "NCO Declared",     kind: "text"     },
      { key: "nco_reason",           label: "NCO Reason",       kind: "text"     },
      { key: "ud_remarks",           label: "UD Remarks",       kind: "text"     },
      { key: "next_workcenter",      label: "Next Workcenter",  kind: "text"     },
      { key: "production_date",      label: "Production Date",  kind: "datetime" },
      { key: "shift",                label: "Shift",            kind: "text"     },
      { key: "production_workcenter",label: "Production WC",    kind: "text"     },
    ],
  },
  {
    title: "Chemistry (%)",
    fields: [
      { key: "s_aluminium_pct",  label: "Al %", kind: "number" },
      { key: "s_boron_pct",      label: "B %",  kind: "number" },
      { key: "s_carbon_pct",     label: "C %",  kind: "number" },
      { key: "s_chromium_pct",   label: "Cr %", kind: "number" },
      { key: "s_copper_pct",     label: "Cu %", kind: "number" },
      { key: "s_manganese_pct",  label: "Mn %", kind: "number" },
      { key: "s_molybdenum_pct", label: "Mo %", kind: "number" },
      { key: "s_nickel_pct",     label: "Ni %", kind: "number" },
      { key: "s_niobium_pct",    label: "Nb %", kind: "number" },
      { key: "s_phosphorus_pct", label: "P %",  kind: "number" },
      { key: "s_silicon_pct",    label: "Si %", kind: "number" },
      { key: "s_sulphur_pct",    label: "S %",  kind: "number" },
      { key: "s_titanium_pct",   label: "Ti %", kind: "number" },
      { key: "s_vanadium_pct",   label: "V %",  kind: "number" },
    ],
  },
  {
    title: "Mechanical",
    fields: [
      { key: "ys_in_mpa",              label: "YS (MPa)",         kind: "number" },
      { key: "elongation",             label: "Elongation",       kind: "text"   },
      { key: "elongation_mic",         label: "Elongation (Mic)", kind: "number" },
      { key: "hardness",               label: "Hardness",         kind: "text"   },
      { key: "tensile_strength_mpa_b", label: "Tensile (MPa B)",  kind: "number" },
      { key: "yield_strength",         label: "Yield Strength",   kind: "text"   },
      { key: "uts",                    label: "UTS",              kind: "text"   },
    ],
  },
  {
    title: "Logistics / Export",
    fields: [
      { key: "location",              label: "Location",         kind: "text"     },
      { key: "str_no",                label: "STR No.",          kind: "text"     },
      { key: "sto_no",                label: "STO No.",          kind: "text"     },
      { key: "do_no",                 label: "DO No.",           kind: "text"     },
      { key: "shipment",              label: "Shipment",         kind: "text"     },
      { key: "storage_location",      label: "Storage Location", kind: "text"     },
      { key: "port_name",             label: "Port Name",        kind: "text"     },
      { key: "unloading_point",       label: "Unloading Point",  kind: "text"     },
      { key: "recieving_point",       label: "Receiving Point",  kind: "text"     },
      { key: "purchase_order_number", label: "PO Number",        kind: "text"     },
      { key: "route",                 label: "Route",            kind: "text"     },
      { key: "route_desc",            label: "Route Desc",       kind: "text"     },
      { key: "cp_number",             label: "CP Number",        kind: "text"     },
      { key: "cp_end_date",           label: "CP End Date",      kind: "datetime" },
      { key: "lc_exp_date",           label: "LC Exp Date",      kind: "text"     },
    ],
  },
  {
    title: "Meta",
    fields: [
      { key: "source_file", label: "Source File", kind: "text"     },
      { key: "created_at",  label: "Created",     kind: "datetime" },
      { key: "updated_at",  label: "Updated",     kind: "datetime" },
    ],
  },
]

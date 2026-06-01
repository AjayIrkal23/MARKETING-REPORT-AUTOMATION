# JVML Stock — ADDENDUM (Synthesizer Output)
> Single source of truth for the build. Supersedes any conflicting detail in individual notes files.
> Generated 2026-05-31 by the plan-checker/synthesizer agent.
> Builder agents: read this BEFORE reading individual notes files.

---

## 1. DEFINITIVE FILE LIST (all files to create, with owner area)

### Backend — NEW files only (builders create; ORCHESTRATOR wires)

| File | Owner area |
|---|---|
| `backend/app/models/jvml_stock.py` | BE-model |
| `backend/app/models/jvml_stock_config.py` | BE-model |
| `backend/app/models/jvml_stock_ingestion.py` | BE-model |
| `backend/app/schemas/jvml_stock.py` | BE-schema |
| `backend/app/schemas/jvml_stock_record.py` | BE-schema |
| `backend/app/schemas/jvml_stock_config.py` | BE-schema |
| `backend/app/utils/jvml_stock/__init__.py` | BE-columns-excel |
| `backend/app/utils/jvml_stock/columns.py` | BE-columns-excel |
| `backend/app/utils/jvml_stock/excel.py` | BE-columns-excel |
| `backend/app/utils/jvml_stock/query.py` | BE-services-core |
| `backend/app/services/jvml_stock/__init__.py` | BE-services-core |
| `backend/app/services/jvml_stock/serialize.py` | BE-services-core |
| `backend/app/services/jvml_stock/list.py` | BE-services-core |
| `backend/app/services/jvml_stock/options.py` | BE-services-core |
| `backend/app/services/jvml_stock/customer_map.py` | BE-ingest-poller |
| `backend/app/services/jvml_stock/ingest.py` | BE-ingest-poller |
| `backend/app/services/jvml_stock/poller.py` | BE-ingest-poller |
| `backend/app/services/jvml_stock/emails.py` | BE-ingest-poller |
| `backend/app/services/jvml_stock/config_service.py` | BE-ingest-poller |
| `backend/app/services/jvml_stock/status.py` | BE-ingest-poller |
| `backend/app/services/cron/jvml_stock.py` | BE-ingest-poller |
| `backend/app/controllers/jvml_stock.py` | BE-controller-routes |
| `backend/app/controllers/jvml_stock_config.py` | BE-controller-routes |
| `backend/app/routes/jvml_stock.py` | BE-controller-routes |

**Total backend new files: 24**

### Frontend — NEW files only (builders create; ORCHESTRATOR wires)

| File | Owner area |
|---|---|
| `frontend/src/types/jvml-stock/stock.ts` | FE-types-api |
| `frontend/src/types/jvml-stock/stock-ui.ts` | FE-types-api / FE-hook-page (shared ownership — stock-ui.ts is produced once, not twice) |
| `frontend/src/types/settings/jvml-stock-config.ts` | FE-types-api / FE-settings |
| `frontend/src/types/settings/jvml-stock-config-ui.ts` | FE-types-api / FE-settings |
| `frontend/src/api/jvml-stock/list.ts` | FE-types-api |
| `frontend/src/api/jvml-stock/options.ts` | FE-types-api / FE-toolbar-filters |
| `frontend/src/api/settings/jvml-stock-config/get.ts` | FE-types-api / FE-settings |
| `frontend/src/api/settings/jvml-stock-config/update.ts` | FE-types-api / FE-settings |
| `frontend/src/api/settings/jvml-stock-config/status.ts` | FE-types-api / FE-settings |
| `frontend/src/api/settings/jvml-stock-config/runNow.ts` | FE-types-api / FE-settings |
| `frontend/src/components/jvml-stock/JvmlStockTable.tsx` | FE-table-pagination |
| `frontend/src/components/jvml-stock/JvmlStockTablePagination.tsx` | FE-table-pagination |
| `frontend/src/components/jvml-stock/JvmlStockTableToolbar.tsx` | FE-toolbar-filters |
| `frontend/src/components/jvml-stock/JvmlStockFilters.tsx` | FE-toolbar-filters |
| `frontend/src/components/jvml-stock/ViewJvmlStockSheet.tsx` | FE-viewsheet |
| `frontend/src/components/jvml-stock/jvml-stock-fields.ts` | FE-viewsheet |
| `frontend/src/components/jvml-stock/hooks/useJvmlStockList.ts` | FE-hook-page |
| `frontend/src/components/settings/JvmlStockConfigCard.tsx` | FE-settings |
| `frontend/src/components/settings/JvmlStockConfigStatus.tsx` | FE-settings |
| `frontend/src/components/settings/hooks/useJvmlStockConfig.ts` | FE-settings |
| `frontend/src/pages/jvml-stock/index.tsx` | FE-hook-page |

**Total frontend new files (builder-owned): 21**

### Shared files — ORCHESTRATOR ONLY (re-read before each edit, append-only)

| File | Change summary |
|---|---|
| `backend/app/models/__init__.py` | Add 3 JvmlStock* imports + update `__all__` |
| `backend/app/core/database.py` | Add 3 models to import line + DOCUMENT_MODELS list |
| `backend/app/models/audit_log.py` | Add `"jvml_stock"` to AuditCategory Literal |
| `backend/app/schemas/audit_log.py` | Add `"jvml_stock"` to AuditCategory Literal (keep in sync) |
| `backend/app/services/audit_log/options.py` | Add `"jvml_stock"` to `_CATEGORIES` list |
| `backend/app/services/audit/events.py` | Append `audit_jvml_stock_event` function |
| `backend/app/core/scheduler.py` | Add `async def apply_jvml_stock_schedule()` + startup call |
| `backend/app/routes/__init__.py` | Add `jvml_stock` to from-import; include both routers |
| `backend/app/services/cron/__init__.py` | Export `jvml_stock_poll_job` |
| `frontend/src/api/client.ts` | Add `putData<T>` helper (PUT → unwrap data) |
| `frontend/src/components/layout/nav-items.ts` | Add Boxes+Settings imports; JVML nav item; Settings admin item |
| `frontend/src/App.tsx` | Add JvmlStockListPage import + /jvml-stock route + /admin/settings route |
| `frontend/src/pages/admin/settings/index.tsx` | CREATE (does not exist) with JvmlStockConfigCard |
| `frontend/src/types/admin/audit-log.ts` | Add `"jvml_stock"` to AuditCategory union |
| `frontend/src/components/admin/audit-logs/AuditCategoryBadge.tsx` | Add `jvml_stock` cyan entry to CATEGORY_MAP |

**Total shared files modified by ORCHESTRATOR: 15**

---

## 2. FOUR AUTHORITATIVE FIELD ARTIFACTS

> Copy verbatim. These four must stay byte-identical in field names and order.
> Source authority: SPEC §1 (72 columns) + §1 meta fields (7 fields).

### 2a. Python `JvmlStock` model field block (Beanie Document — `app/models/jvml_stock.py`)

```python
    # --- §1 data cols 1-11 (text, filter-indexed) ---
    so_sales_org:      Annotated[str | None, Indexed()] = None
    sales_order_type:  Annotated[str | None, Indexed()] = None
    distr_chnl:        Annotated[str | None, Indexed()] = None
    sold_to_party:     Annotated[str | None, Indexed()] = None
    party_code:        Annotated[str | None, Indexed()] = None
    ship_to_party:     Annotated[str | None, Indexed()] = None
    customer:          Annotated[str | None, Indexed()] = None
    material:          Annotated[str | None, Indexed()] = None
    sales_office:      Annotated[str | None, Indexed()] = None
    so_product_form:   Annotated[str | None, Indexed()] = None
    jsw_grade:         Annotated[str | None, Indexed()] = None
    # --- cols 12-19 (text/number, not filter-indexed) ---
    act_thickness_mm:  str | None = None
    width_mm:          str | None = None
    batch:             str | None = None
    unrestr_qty:       float | None = None
    in_quality_insp:   float | None = None
    blocked:           float | None = None
    stock_quantity:    float | None = None
    usage_decision:    str | None = None
    # --- col 20 (text, filter-indexed) ---
    nco_declared:      Annotated[str | None, Indexed()] = None
    # --- cols 21-45 (text/number, not filtered) ---
    next_workcenter:        str | None = None
    length_mm:              str | None = None
    nco_reason:             str | None = None
    ud_remarks:             str | None = None
    aging:                  float | None = None
    production_date:        datetime | None = None
    shift:                  str | None = None
    sales_order_no:         str | None = None
    so_item_num:            str | None = None
    order_status:           str | None = None
    location:               str | None = None
    str_no:                 str | None = None
    sto_no:                 str | None = None
    do_no:                  str | None = None
    shipment:               str | None = None
    storage_location:       str | None = None
    port_name:              str | None = None
    unloading_point:        str | None = None
    recieving_point:        str | None = None    # original Excel spelling preserved
    purchase_order_number:  str | None = None
    scheduled_status:       str | None = None
    eq_specification:       str | None = None
    eq_sub_grade:           str | None = None
    so_end_application:     str | None = None
    production_workcenter:  str | None = None
    # --- cols 46-66 (number/text alternating) ---
    ys_in_mpa:              float | None = None
    elongation:             str | None = None
    elongation_mic:         float | None = None
    hardness:               str | None = None
    s_aluminium_pct:        float | None = None
    s_boron_pct:            float | None = None
    s_carbon_pct:           float | None = None
    s_chromium_pct:         float | None = None
    s_copper_pct:           float | None = None
    s_manganese_pct:        float | None = None
    s_molybdenum_pct:       float | None = None
    s_nickel_pct:           float | None = None
    s_niobium_pct:          float | None = None
    s_phosphorus_pct:       float | None = None
    s_silicon_pct:          float | None = None
    s_sulphur_pct:          float | None = None
    s_titanium_pct:         float | None = None
    s_vanadium_pct:         float | None = None
    tensile_strength_mpa_b: float | None = None
    yield_strength:         str | None = None
    uts:                    str | None = None
    # --- cols 67-72 (text/date) ---
    special_stock:  str | None = None
    cp_number:      str | None = None
    cp_end_date:    datetime | None = None
    lc_exp_date:    str | None = None    # text (dd.mm.yyyy stored verbatim — NOT coerced to datetime)
    route:          str | None = None
    route_desc:     str | None = None
    # --- 7 meta/mapping fields ---
    party_code_normalized: Annotated[str | None, Indexed()] = None
    customer_name:         Annotated[str | None, Indexed()] = None
    customer_code_id:      Annotated[str | None, Indexed()] = None
    report_date:           Annotated[str, Indexed()]          # REQUIRED — no default
    source_file:           str | None = None
    created_at:            Annotated[datetime, Indexed()] = Field(default_factory=_now_utc)
    updated_at:            datetime = Field(default_factory=_now_utc)
```

### 2b. Python `JvmlStockPublic` field block (Pydantic BaseModel — `app/schemas/jvml_stock_record.py`)

```python
    id: str
    # --- §1 72 data columns ---
    so_sales_org: str | None
    sales_order_type: str | None
    distr_chnl: str | None
    sold_to_party: str | None
    party_code: str | None
    ship_to_party: str | None
    customer: str | None
    material: str | None
    sales_office: str | None
    so_product_form: str | None
    jsw_grade: str | None
    act_thickness_mm: str | None
    width_mm: str | None
    batch: str | None
    unrestr_qty: float | None
    in_quality_insp: float | None
    blocked: float | None
    stock_quantity: float | None
    usage_decision: str | None
    nco_declared: str | None
    next_workcenter: str | None
    length_mm: str | None
    nco_reason: str | None
    ud_remarks: str | None
    aging: float | None
    production_date: datetime | None
    shift: str | None
    sales_order_no: str | None
    so_item_num: str | None
    order_status: str | None
    location: str | None
    str_no: str | None
    sto_no: str | None
    do_no: str | None
    shipment: str | None
    storage_location: str | None
    port_name: str | None
    unloading_point: str | None
    recieving_point: str | None           # original Excel spelling preserved
    purchase_order_number: str | None
    scheduled_status: str | None
    eq_specification: str | None
    eq_sub_grade: str | None
    so_end_application: str | None
    production_workcenter: str | None
    ys_in_mpa: float | None
    elongation: str | None
    elongation_mic: float | None
    hardness: str | None
    s_aluminium_pct: float | None
    s_boron_pct: float | None
    s_carbon_pct: float | None
    s_chromium_pct: float | None
    s_copper_pct: float | None
    s_manganese_pct: float | None
    s_molybdenum_pct: float | None
    s_nickel_pct: float | None
    s_niobium_pct: float | None
    s_phosphorus_pct: float | None
    s_silicon_pct: float | None
    s_sulphur_pct: float | None
    s_titanium_pct: float | None
    s_vanadium_pct: float | None
    tensile_strength_mpa_b: float | None
    yield_strength: str | None
    uts: str | None
    special_stock: str | None
    cp_number: str | None
    cp_end_date: datetime | None
    lc_exp_date: str | None               # text (dd.mm.yyyy verbatim)
    route: str | None
    route_desc: str | None
    # --- 7 meta/mapping fields ---
    party_code_normalized: str | None
    customer_name: str | None
    customer_code_id: str | None
    report_date: str                       # dd-mm-yyyy, always set
    source_file: str | None
    created_at: datetime
    updated_at: datetime
```

Total fields: `id` (1) + 72 data + 7 meta = **80 fields**.
Verify with: `./.venv/bin/python -c "from app.schemas.jvml_stock_record import JvmlStockPublic; print(len(JvmlStockPublic.model_fields))"` → expect 80.

### 2c. TypeScript `JvmlStock` interface (`src/types/jvml-stock/stock.ts`)

```typescript
export interface JvmlStock {
  id: string
  // --- §1 72 columns ---
  so_sales_org: string | null            // col 1  text  filter
  sales_order_type: string | null        // col 2  text  filter
  distr_chnl: string | null             // col 3  text  filter
  sold_to_party: string | null          // col 4  text  filter+q
  party_code: string | null             // col 5  text  q
  ship_to_party: string | null          // col 6  text  q
  customer: string | null               // col 7  text  filter+q
  material: string | null               // col 8  text  filter+q
  sales_office: string | null           // col 9  text  filter+q
  so_product_form: string | null        // col 10 text  filter
  jsw_grade: string | null              // col 11 text  filter+q
  act_thickness_mm: string | null       // col 12 text
  width_mm: string | null               // col 13 text
  batch: string | null                  // col 14 text  q
  unrestr_qty: number | null            // col 15 number
  in_quality_insp: number | null        // col 16 number
  blocked: number | null                // col 17 number
  stock_quantity: number | null         // col 18 number
  usage_decision: string | null         // col 19 text
  nco_declared: string | null           // col 20 text  filter
  next_workcenter: string | null        // col 21 text
  length_mm: string | null              // col 22 text
  nco_reason: string | null             // col 23 text
  ud_remarks: string | null             // col 24 text
  aging: number | null                  // col 25 number
  production_date: string | null        // col 26 date  ISO-8601 string from BE
  shift: string | null                  // col 27 text
  sales_order_no: string | null         // col 28 text  q
  so_item_num: string | null            // col 29 text
  order_status: string | null           // col 30 text
  location: string | null               // col 31 text
  str_no: string | null                 // col 32 text
  sto_no: string | null                 // col 33 text
  do_no: string | null                  // col 34 text
  shipment: string | null               // col 35 text
  storage_location: string | null       // col 36 text
  port_name: string | null              // col 37 text
  unloading_point: string | null        // col 38 text
  recieving_point: string | null        // col 39 text  NOTE: original Excel misspelling
  purchase_order_number: string | null  // col 40 text
  scheduled_status: string | null       // col 41 text
  eq_specification: string | null       // col 42 text
  eq_sub_grade: string | null           // col 43 text
  so_end_application: string | null     // col 44 text
  production_workcenter: string | null  // col 45 text
  ys_in_mpa: number | null              // col 46 number
  elongation: string | null             // col 47 text
  elongation_mic: number | null         // col 48 number
  hardness: string | null               // col 49 text
  s_aluminium_pct: number | null        // col 50 number
  s_boron_pct: number | null            // col 51 number
  s_carbon_pct: number | null           // col 52 number
  s_chromium_pct: number | null         // col 53 number
  s_copper_pct: number | null           // col 54 number
  s_manganese_pct: number | null        // col 55 number
  s_molybdenum_pct: number | null       // col 56 number
  s_nickel_pct: number | null           // col 57 number
  s_niobium_pct: number | null          // col 58 number
  s_phosphorus_pct: number | null       // col 59 number
  s_silicon_pct: number | null          // col 60 number
  s_sulphur_pct: number | null          // col 61 number
  s_titanium_pct: number | null         // col 62 number
  s_vanadium_pct: number | null         // col 63 number
  tensile_strength_mpa_b: number | null // col 64 number
  yield_strength: string | null         // col 65 text
  uts: string | null                    // col 66 text
  special_stock: string | null          // col 67 text
  cp_number: string | null              // col 68 text
  cp_end_date: string | null            // col 69 date  ISO-8601 string from BE
  lc_exp_date: string | null            // col 70 text  (dd.mm.yyyy verbatim — NOT a date)
  route: string | null                  // col 71 text
  route_desc: string | null             // col 72 text
  // --- 7 meta/mapping fields ---
  party_code_normalized: string | null
  customer_name: string | null
  customer_code_id: string | null
  report_date: string                    // "dd-mm-yyyy"
  source_file: string | null
  created_at: string                     // ISO-8601 UTC — date-range filter field
  updated_at: string                     // ISO-8601 UTC
}
```

### 2d. `COLUMNS` list for `app/utils/jvml_stock/columns.py`

```python
COLUMNS: list[tuple[str, str, str]] = [
    ("SO Sales Org",               "so_sales_org",               "text"),
    ("Sales Order Type",           "sales_order_type",           "text"),
    ("Distr.Chnl",                 "distr_chnl",                 "text"),
    ("Sold To Party",              "sold_to_party",              "text"),
    ("Party Code",                 "party_code",                 "text"),
    ("Ship To Party",              "ship_to_party",              "text"),
    ("Customer",                   "customer",                   "text"),
    ("Material",                   "material",                   "text"),
    ("Sales Office",               "sales_office",               "text"),
    ("SO-Product Form",            "so_product_form",            "text"),
    ("JSW Grade",                  "jsw_grade",                  "text"),
    ("Act.Thickness (mm)",         "act_thickness_mm",           "text"),
    ("Width (mm)",                 "width_mm",                   "text"),
    ("Batch",                      "batch",                      "text"),
    ("Unrestr.Qty.",               "unrestr_qty",                "number"),
    ("In Quality Insp.",           "in_quality_insp",            "number"),
    ("Blocked",                    "blocked",                    "number"),
    ("Stock Quantity",             "stock_quantity",             "number"),
    ("Usage Decision",             "usage_decision",             "text"),
    ("NCO Declared",               "nco_declared",               "text"),
    ("Next Workcenter",            "next_workcenter",            "text"),
    ("Length(mm)",                 "length_mm",                  "text"),
    ("NCO Reason",                 "nco_reason",                 "text"),
    ("UD Remarks",                 "ud_remarks",                 "text"),
    ("Aging",                      "aging",                      "number"),
    ("Production Date",            "production_date",            "date"),
    ("Shift",                      "shift",                      "text"),
    ("Sales Order No",             "sales_order_no",             "text"),
    ("SO Item Num",                "so_item_num",                "text"),
    ("Order Status",               "order_status",               "text"),
    ("Location",                   "location",                   "text"),
    ("STR No",                     "str_no",                     "text"),
    ("STO No",                     "sto_no",                     "text"),
    ("DO No",                      "do_no",                      "text"),
    ("Shipment",                   "shipment",                   "text"),
    ("Storage Location",           "storage_location",           "text"),
    ("Port Name",                  "port_name",                  "text"),
    ("UNLOADING POINT",            "unloading_point",            "text"),
    ("RECIEVING POINT",            "recieving_point",            "text"),
    ("Purchase Order Number",      "purchase_order_number",      "text"),
    ("Scheduled Status",           "scheduled_status",           "text"),
    ("Eq. Specification",          "eq_specification",           "text"),
    ("Eq. Sub Grade",              "eq_sub_grade",               "text"),
    ("SO-End Application",         "so_end_application",         "text"),
    ("production workcenter",      "production_workcenter",      "text"),
    ("YS in MPa",                  "ys_in_mpa",                  "number"),
    ("ELONGATION",                 "elongation",                 "text"),
    ("Elongation(Mic)",            "elongation_mic",             "number"),
    ("HARDNESS",                   "hardness",                   "text"),
    ("S_ALUMINIUM_PCT",            "s_aluminium_pct",            "number"),
    ("S_BORON_PCT",                "s_boron_pct",                "number"),
    ("S_CARBON_PCT",               "s_carbon_pct",               "number"),
    ("S_CHROMIUM_PCT",             "s_chromium_pct",             "number"),
    ("S_COPPER_PCT",               "s_copper_pct",               "number"),
    ("S_MANGANESE_PCT",            "s_manganese_pct",            "number"),
    ("S_MOLYBDENUM_PCT",           "s_molybdenum_pct",           "number"),
    ("S_NICKEL_PCT",               "s_nickel_pct",               "number"),
    ("S_NIOBIUM_PCT",              "s_niobium_pct",              "number"),
    ("S_PHOSPHORUS_PCT",           "s_phosphorus_pct",           "number"),
    ("S_SILICON_PCT",              "s_silicon_pct",              "number"),
    ("S_SULPHUR_PCT",              "s_sulphur_pct",              "number"),
    ("S_TITANIUM_PCT",             "s_titanium_pct",             "number"),
    ("S_VANADIUM_PCT",             "s_vanadium_pct",             "number"),
    ("Tensile Strength MPa (B)",   "tensile_strength_mpa_b",     "number"),
    ("YIELD STRENGTH",             "yield_strength",             "text"),
    ("UTS",                        "uts",                        "text"),
    ("Special Stock",              "special_stock",              "text"),
    ("CP Number",                  "cp_number",                  "text"),
    ("CP End Date",                "cp_end_date",                "date"),
    ("LC Exp Date",                "lc_exp_date",                "text"),
    ("Route",                      "route",                      "text"),
    ("Route Desc",                 "route_desc",                 "text"),
]
```

**Column count: exactly 72. Verified against live workbook.**

---

## 3. VIEW-SHEET FIELD CONFIG (`jvml-stock-fields.ts`) — 9 groups, all fields

Path: `frontend/src/components/jvml-stock/jvml-stock-fields.ts`

This config drives `ViewJvmlStockSheet.tsx`. All 72 SPEC columns + 6 meta fields (excluding `id`,
which appears in the sheet header subtitle) are covered across 9 groups. Field order within each
group is as defined here — do not reorder.

```typescript
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
      { key: "sales_order_no",        label: "Sales Order No",   kind: "text" },
      { key: "so_item_num",           label: "SO Item Num",      kind: "text" },
      { key: "so_sales_org",          label: "SO Sales Org",     kind: "text" },
      { key: "sales_order_type",      label: "Sales Order Type", kind: "text" },
      { key: "order_status",          label: "Order Status",     kind: "text" },
      { key: "scheduled_status",      label: "Scheduled Status", kind: "text" },
      { key: "so_product_form",       label: "SO Product Form",  kind: "text" },
      { key: "so_end_application",    label: "End Application",  kind: "text" },
      { key: "purchase_order_number", label: "PO Number",        kind: "text" },
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
      { key: "material",           label: "Material",              kind: "text" },
      { key: "jsw_grade",          label: "JSW Grade",             kind: "text" },
      { key: "batch",              label: "Batch",                 kind: "text" },
      { key: "act_thickness_mm",   label: "Act. Thickness (mm)",   kind: "text" },
      { key: "width_mm",           label: "Width (mm)",            kind: "text" },
      { key: "length_mm",          label: "Length (mm)",           kind: "text" },
      { key: "eq_specification",   label: "Eq. Specification",     kind: "text" },
      { key: "eq_sub_grade",       label: "Eq. Sub Grade",         kind: "text" },
      { key: "special_stock",      label: "Special Stock",         kind: "text" },
      { key: "production_date",    label: "Production Date",       kind: "date" },
      { key: "shift",              label: "Shift",                 kind: "text" },
      { key: "aging",              label: "Aging (days)",          kind: "number" },
    ],
  },
  {
    group: "Quantities",
    fields: [
      { key: "unrestr_qty",     label: "Unrestricted Qty", kind: "number" },
      { key: "in_quality_insp", label: "In Quality Insp.", kind: "number" },
      { key: "blocked",         label: "Blocked",          kind: "number" },
      { key: "stock_quantity",  label: "Stock Quantity",   kind: "number" },
    ],
  },
  {
    group: "Quality / NCO",
    fields: [
      { key: "usage_decision",        label: "Usage Decision",   kind: "text" },
      { key: "ud_remarks",            label: "UD Remarks",       kind: "text" },
      { key: "nco_declared",          label: "NCO Declared",     kind: "text" },
      { key: "nco_reason",            label: "NCO Reason",       kind: "text" },
      { key: "next_workcenter",       label: "Next Workcenter",  kind: "text" },
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
      { key: "ys_in_mpa",              label: "YS (MPa)",         kind: "number" },
      { key: "tensile_strength_mpa_b", label: "Tensile (MPa)",    kind: "number" },
      { key: "elongation",             label: "Elongation",       kind: "text" },
      { key: "elongation_mic",         label: "Elongation (Mic)", kind: "number" },
      { key: "hardness",               label: "Hardness",         kind: "text" },
      { key: "yield_strength",         label: "Yield Strength",   kind: "text" },
      { key: "uts",                    label: "UTS",               kind: "text" },
    ],
  },
  {
    group: "Logistics / Export",
    fields: [
      { key: "location",          label: "Location",         kind: "text" },
      { key: "storage_location",  label: "Storage Location", kind: "text" },
      { key: "str_no",            label: "STR No",           kind: "text" },
      { key: "sto_no",            label: "STO No",           kind: "text" },
      { key: "do_no",             label: "DO No",            kind: "text" },
      { key: "shipment",          label: "Shipment",         kind: "text" },
      { key: "port_name",         label: "Port Name",        kind: "text" },
      { key: "unloading_point",   label: "Unloading Point",  kind: "text" },
      { key: "recieving_point",   label: "Receiving Point",  kind: "text" },  // label fixed; key keeps misspelling
      { key: "route",             label: "Route",            kind: "text" },
      { key: "route_desc",        label: "Route Desc",       kind: "text" },
      { key: "cp_number",         label: "CP Number",        kind: "text" },
      { key: "cp_end_date",       label: "CP End Date",      kind: "date" },
      { key: "lc_exp_date",       label: "LC Exp Date",      kind: "text" },  // text, NOT date
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

**Field group coverage check:** 9 + 9 + 12 + 4 + 6 + 14 + 7 + 14 + 4 = **79 fields** across groups.
`id` (the 80th field) appears only in the sheet header subtitle, not as a detail row.

---

## 4. CORRECTIONS — Notes files vs SPEC (notes WIN where documented)

### C1. `meta` shape in `success()` call (from be-controller-routes.md — SPEC §2 WRONG)
**SPEC §2 says:** `return success(rows, meta={"pagination": meta.model_dump()})`
**Correct pattern (from reference code):** `return success(items, meta=meta)` — pass the `PaginationMeta` object directly. `success()` signature: `success(data, message="", meta: PaginationMeta | None = None)`. Passing a dict breaks Pydantic.
**ACTION: Use `success(items, meta=meta)` — do NOT wrap in `{"pagination": ...}`.**

### C2. `apply_jvml_stock_schedule` must be async (from be-ingest-poller.md)
**SPEC §2 says:** "sync wrapper or via a small async runner."
**Correct pattern:** `apply_jvml_stock_schedule` must be `async def` because calling `get_config()` (itself async) from sync code inside a running FastAPI event loop will deadlock via `asyncio.run()`. Make it `async` and `await` it inside `upsert_config`.
**ACTION: Define `async def apply_jvml_stock_schedule()` in `core/scheduler.py`. Change `upsert_config` call to `await apply_jvml_stock_schedule()`.**

### C3. `cron/jvml_stock.py` import of `audited_job` (from wiring.md — SPEC §2 WRONG)
**SPEC §2 says:** `from .decorators import audited_job` — `decorators.py` does NOT exist.
**Correct pattern:** `from . import audited_job` (the `__init__.py` re-exports it from `heartbeat.py`), OR `from .heartbeat import audited_job`.
**ACTION: Use `from . import audited_job` in `services/cron/jvml_stock.py`.**

### C4. `notify_emails` field constraint on `JvmlStockConfigUpdate` (from be-schema.md)
**SPEC says:** `notify_emails: list[EmailStr] (max_length=100)` — `max_length=100` on a `list` field does NOT limit list length in Pydantic v2 via `Field(max_length=100)` without `Annotated`.
**Correct pattern:** Use `Field(default_factory=list)` without `max_length`; enforce the 100-item cap inside the `normalize_emails` mode="before" validator (mirrors `region.py`).
**ACTION: Do NOT put `max_length=100` on the `Field()` for `notify_emails`. Enforce in the validator.**

### C5. `JvmlStockIngestion.find_one({}, sort=...)` (from be-ingest-poller.md)
**SPEC:** Assumes `find_one` accepts a `sort` kwarg in Beanie 2.x.
**Correct pattern:** Use `.find().sort("-created_at").limit(1).to_list()` → take `[0]` if non-empty. The `find_one` sort kwarg is not reliable across Beanie versions.
**ACTION: Use the safe `.find().sort("-created_at").limit(1).to_list()` pattern in `status.py`.**

### C6. `poller.py` — `send_missing_alert` accepts `JvmlStockConfigPublic`, not a raw doc (from be-ingest-poller.md)
**SPEC §2 (poller):** "send_missing_alert(config, today)" — ambiguous about whether `config` is the doc or the DTO.
**Correct pattern:** Pass the result of `await get_config()` (returns `JvmlStockConfigPublic`) directly to `send_missing_alert`. The DTO has all three fields needed (`.notify_emails`, `.file_name`, `.base_path`). No local import of `JvmlStockConfig` doc is needed in `poller.py`.
**ACTION: `send_missing_alert` accepts any object with `.notify_emails`, `.file_name`, `.base_path`. Pass `config` (JvmlStockConfigPublic) directly.**

### C7. `JvmlStockTableToolbar` needs `onClearFilters` prop (from fe-hook-page.md)
**SPEC §3:** Toolbar has a "Clear all" action in the filters popover.
**Correct pattern:** Add `onClearFilters: () => void` to `JvmlStockTableToolbarProps` so the page can pass `clearFilters` from the hook. The toolbar passes it to `JvmlStockFilters.onClearAll`.
**ACTION: Add `onClearFilters: () => void` to `JvmlStockTableToolbarProps` and pass it through to `JvmlStockFilters`.**

### C8. `JvmlStockListPage` is `default export` (from fe-hook-page.md)
**SPEC §3:** `export default function JvmlStockListPage()`.
**Reference pattern:** `CustomerCodeManagementPage` is a named export. But SPEC is authoritative for JVML Stock — use default export so `App.tsx` can lazy-import: `const JvmlStockListPage = lazy(() => import("@/pages/jvml-stock"))`.
**ACTION: Use `export default function JvmlStockListPage()` in `pages/jvml-stock/index.tsx`.**

### C9. `putData` absent from `client.ts` (from fe-types-api.md, fe-settings.md, wiring.md)
`client.ts` exports: `getData`, `postData`, `patchData`, `deleteData`, `getList`, `buildQuery`. `putData` is absent. ORCHESTRATOR adds it (one time only — both JVML and JSW sessions need it, ORCHESTRATOR adds it once).
**Builder action:** Import `putData` in `src/api/settings/jvml-stock-config/update.ts`. TypeScript will error until ORCHESTRATOR wires it. Add a `// TODO: added by ORCHESTRATOR` comment.

### C10. `audit_jvml_stock_event` category value (from wiring.md — confirming SPEC is correct)
The category string is `"jvml_stock"` (singular, underscore). This matches what SPEC §4 adds to the Literal. Consistent with `"customer_codes"` (plural) and `"regions"` (plural) being different namespaces. `"jvml_stock"` is the correct value — not `"jvml_stocks"`.

### C11. `AuditCategoryBadge.tsx` TypeScript compile constraint (from wiring.md)
After adding `"jvml_stock"` to the `AuditCategory` union in `types/admin/audit-log.ts`, the `satisfies Record<...>` check on `CATEGORY_MAP` in `AuditCategoryBadge.tsx` will fail at compile time unless the `jvml_stock` key is also present in the map. ORCHESTRATOR must update both files atomically.

### C12. `services/cron/__init__.py` must export `jvml_stock_poll_job` (from wiring.md)
After creating `services/cron/jvml_stock.py`, the ORCHESTRATOR must append:
```python
from .jvml_stock import jvml_stock_poll_job
```
to `services/cron/__init__.py` (and include `"jvml_stock_poll_job"` in `__all__`).

---

## 5. ORCHESTRATOR WIRING CHECKLIST (append-only, serialized pass)

Re-read EVERY shared file immediately before editing it (JSW session may have already changed it).
Apply changes in the order listed. All edits are additive/append-only.

### Backend wiring (8 files)

- [ ] **B1. `app/models/__init__.py`**
  - Append after `from .user import User`:
    ```python
    from .jvml_stock import JvmlStock
    from .jvml_stock_config import JvmlStockConfig
    from .jvml_stock_ingestion import JvmlStockIngestion
    ```
  - Update `__all__` to include `"JvmlStock"`, `"JvmlStockConfig"`, `"JvmlStockIngestion"` (alphabetical: add after `"CustomerCode"`, before `"Region"`).

- [ ] **B2. `app/core/database.py`**
  - Expand the `from ..models import ...` line to include `JvmlStock, JvmlStockConfig, JvmlStockIngestion`.
  - Append `JvmlStock, JvmlStockConfig, JvmlStockIngestion` to `DOCUMENT_MODELS` list (after `Region`).

- [ ] **B3. `app/models/audit_log.py`**
  - Add `"jvml_stock"` to the `AuditCategory` Literal (append before closing paren).
  - Merged with JSW: `..., "customer_codes", "jvml_stock", "jsw_stock"]`

- [ ] **B4. `app/schemas/audit_log.py`**
  - Same edit as B3 — both Literals must stay identical.

- [ ] **B5. `app/services/audit_log/options.py`**
  - Append `"jvml_stock"` to `_CATEGORIES` list (after `"customer_codes"`).

- [ ] **B6. `app/services/audit/events.py`**
  - Append `audit_jvml_stock_event` function at end of file (see be-ingest-poller.md §10 for exact body). Category = `"jvml_stock"`, source = `"service"`.

- [ ] **B7. `app/core/scheduler.py`**
  - Add `async def apply_jvml_stock_schedule() -> None` function (see wiring.md §8 — use the ASYNC version, not sync wrapper).
  - Append best-effort startup call inside `start_scheduler` `try` block after the heartbeat log line:
    ```python
    try:
        await apply_jvml_stock_schedule()
    except Exception:
        logger.warning("Could not pre-register JVML stock job at startup.", exc_info=True)
    ```

- [ ] **B8. `app/routes/__init__.py`**
  - Add `jvml_stock` to the `from . import ...` line (alphabetically).
  - Append after last `include_router` call:
    ```python
    api_router.include_router(jvml_stock.router)
    api_router.include_router(jvml_stock.config_router)
    ```

- [ ] **B9. `app/services/cron/__init__.py`** (bonus — not in SPEC §4 but required for correctness)
  - Append: `from .jvml_stock import jvml_stock_poll_job`
  - Update `__all__` to include `"jvml_stock_poll_job"`.

### Frontend wiring (6 files)

- [ ] **F1. `src/api/client.ts`**
  - Insert `putData<T>` helper after `patchData` block, before `deleteData`:
    ```typescript
    /** PUT a JSON body and unwrap `data`. */
    export async function putData<T>(path: string, body: unknown): Promise<T> {
      return (await request<T>(path, { method: "PUT", body: JSON.stringify(body) })).data
    }
    ```
  - Add once only — JSW session needs the same helper.

- [ ] **F2. `src/components/layout/nav-items.ts`**
  - Add `Boxes` and `Settings` to the lucide import (if not already present).
  - Add JVML Stock nav item to `NAV_ITEMS` (after Dashboard, before JSW if present):
    ```typescript
    { label: "JVML Stock List", to: "/jvml-stock", icon: Boxes },
    ```
  - Add Settings to `ADMIN_NAV_ITEMS` (if not already present from JSW pass):
    ```typescript
    { label: "Settings", to: "/admin/settings", icon: Settings },
    ```

- [ ] **F3. `src/App.tsx`**
  - Add import for `JvmlStockListPage` (static import, matching existing file pattern):
    ```typescript
    import { JvmlStockListPage } from "@/pages/jvml-stock"
    ```
    Or use `lazy(() => import("@/pages/jvml-stock"))` if the page uses `export default`.
  - Add `/jvml-stock` route inside `ProtectedRoute + DashboardLayout`, NOT inside `AdminRoute`:
    ```tsx
    <Route path="/jvml-stock" element={<JvmlStockListPage />} />
    ```
  - Add `/admin/settings` route inside `AdminRoute` group (only if not already present):
    ```tsx
    <Route path="/admin/settings" element={<SettingsPage />} />
    ```
  - Add `SettingsPage` import (only if not already present from JSW pass).

- [ ] **F4. `src/pages/admin/settings/index.tsx`** (CREATE — does not exist yet)
  - Create with `JvmlStockConfigCard` (and leave a comment slot for `JswStockConfigCard`).
  - If JSW already created it, append `<JvmlStockConfigCard />` surgically.

- [ ] **F5. `src/types/admin/audit-log.ts`**
  - Append `| "jvml_stock"` to the `AuditCategory` union type.

- [ ] **F6. `src/components/admin/audit-logs/AuditCategoryBadge.tsx`**
  - Insert `jvml_stock` entry with cyan colors into `CATEGORY_MAP` before the `} as const satisfies ...` closing line:
    ```typescript
    jvml_stock: {
      label: "JVML Stock",
      className:
        "border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-800 dark:bg-cyan-950/50 dark:text-cyan-400",
    },
    ```
  - F5 and F6 MUST be applied atomically — the `satisfies` check will fail if only one is done.

---

## 6. CONCURRENCY MERGE NOTES (ORCHESTRATOR)

When applying wiring, assume the JSW Stock session has already run or will run concurrently.
For every shared file, merge BOTH sessions' changes in a single edit:

| File | JVML adds | JSW adds | Merged result |
|---|---|---|---|
| `models/__init__.py` | JvmlStock* (3) | JswStock* (3) | All 6 imports + merged `__all__` |
| `core/database.py` | JvmlStock* (3) | JswStock* (3) | Single import line + single list with all 6 |
| `models/audit_log.py` | `"jvml_stock"` | `"jsw_stock"` | Both values in Literal |
| `schemas/audit_log.py` | `"jvml_stock"` | `"jsw_stock"` | Both values in Literal |
| `services/audit_log/options.py` | `"jvml_stock"` | `"jsw_stock"` | Both in `_CATEGORIES` |
| `services/audit/events.py` | `audit_jvml_stock_event` | `audit_jsw_stock_event` | Sequential appends |
| `core/scheduler.py` | `apply_jvml_stock_schedule` | `apply_jsw_stock_schedule` | Two separate async functions |
| `routes/__init__.py` | `jvml_stock` module + 2 routers | `jsw_stock` module + 2 routers | Merged from-import; both include_router sets |
| `api/client.ts` | `putData` | `putData` (same) | Add once only |
| `nav-items.ts` | Boxes+Settings; JVML nav; Settings admin | Boxes; JSW nav; Settings admin | Dedup Boxes; both nav items; Settings once |
| `App.tsx` | JVML import + route; Settings import + route | JSW import + route; Settings import + route | Both imports; both routes; Settings once |
| `pages/admin/settings/index.tsx` | Create with JvmlStockConfigCard | Append JswStockConfigCard | Create once with both cards |
| `types/admin/audit-log.ts` | `"jvml_stock"` | `"jsw_stock"` | Both union members |
| `AuditCategoryBadge.tsx` | `jvml_stock` cyan | `jsw_stock` orange | Both entries before `} as const satisfies` |

---

## 7. BUILD-READINESS VERDICT

### Coverage check
- Every SPEC §2 backend file has a notes file with ready-to-paste code: **PASS**
- Every SPEC §3 frontend file has a notes file with ready-to-paste code: **PASS**
- All 4 field artifacts (model, DTO, TS interface, COLUMNS list) are present and identical: **PASS**
- 9-group view-sheet config covers all 79 non-id fields: **PASS** (9+9+12+4+6+14+7+14+4 = 79)
- All 15 shared-file wiring steps are documented: **PASS**

### Contradictions resolved
- `meta` shape in `success()` call: SPEC wrong, notes correct (C1)
- `apply_jvml_stock_schedule` sync vs async: SPEC ambiguous, notes correct async pattern (C2)
- `cron/jvml_stock.py` `audited_job` import path: SPEC wrong (`decorators`), notes correct (C3)
- `notify_emails` max_length validator: SPEC misleading, notes correct (C4)
- `find_one` sort kwarg: SPEC assumes, notes give safe alternative (C5)
- `send_missing_alert` config type: SPEC ambiguous, notes clarify DTO is fine (C6)
- Toolbar `onClearFilters` prop: SPEC implicit, notes explicit (C7)
- `JvmlStockListPage` default vs named export: SPEC is authoritative (default export) (C8)

### Known open items (not blockers — ORCHESTRATOR handles)
- `putData` absent from `client.ts` until ORCHESTRATOR wires it (F1)
- `src/pages/admin/settings/index.tsx` does not exist until ORCHESTRATOR creates it (F4)
- `apply_jvml_stock_schedule` does not exist in `core/scheduler.py` until ORCHESTRATOR adds it (B7)
- `audit_jvml_stock_event` does not exist in `services/audit/events.py` until ORCHESTRATOR adds it (B6)
- Builder files that import `audit_jvml_stock_event` or `apply_jvml_stock_schedule` will have import errors until ORCHESTRATOR runs — this is expected and acceptable per SPEC concurrency model.

### Verdict
**PLAN IS BUILD-READY.** No unresolved contradictions remain. Every SPEC-specified file has an owner area and ready-to-paste code in the notes. All SPEC-vs-reality mismatches are documented and corrected here. Builders may proceed with §1 file lists; ORCHESTRATOR proceeds with §5 wiring checklist after all builder sessions complete.

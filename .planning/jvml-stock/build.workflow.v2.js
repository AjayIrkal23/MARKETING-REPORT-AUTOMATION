export const meta = {
  name: 'jvml-stock-build-v2',
  description: 'Build JVML Stock end-to-end: 35 parallel builders clone the proven JSW Stock analog files (swap jsw->jvml) — orchestrator wires shared files by hand',
  phases: [
    { title: 'Build', detail: '35 parallel builders clone JSW analogs into jvml-namespaced files' },
  ],
}

const ROOT = '/DATA/CODE_FILES/MARKETING REPORT AUTOMATION'
const SPEC = `${ROOT}/.planning/jvml-stock/SPEC.md`
const ADDENDUM = `${ROOT}/.planning/jvml-stock/ADDENDUM.md`
const NOTES = `${ROOT}/.planning/jvml-stock/notes`

const GUARD = `HARD RULES — read carefully before writing anything:

# Context
The JSW Stock feature is ALREADY FULLY BUILT and working in this same tree. JVML Stock is the
EXACT SAME feature for a different SAP Excel export ("JVML Stock (99).xlsx") — identical 72-column
structure, identical poller/scheduler/ingest/customer-mapping/audit pattern. Your job is to CLONE
your exact-analog JSW file(s) and rename jsw->jvml. A separate Claude session built JSW; do NOT
edit any jsw file — READ them as your template only.

# Rename map (apply consistently in EVERY identifier, string, path, collection, id)
- jsw_stock      -> jvml_stock        (python modules, collections, fn names, audit category, ids)
- JswStock       -> JvmlStock         (classes, Pydantic models, TS types/interfaces)
- jsw-stock      -> jvml-stock        (frontend dirs, import paths, route paths)
- "JSW Stock"    -> "JVML Stock"       (UI labels, nav, headings, tags)
- "JSW STOCK EXCEL not found" -> "JVML STOCK EXCEL not found" (email subject)
- audit category "jsw_stock" -> "jvml_stock"
- scheduler job id "jsw_stock.poll" -> "jvml_stock.poll"; cron action "cron.jsw_stock_poll" -> "cron.jvml_stock_poll"
- imports: audit_jsw_stock_event -> audit_jvml_stock_event; apply_jsw_stock_schedule -> apply_jvml_stock_schedule; jsw_stock_poll_job -> jvml_stock_poll_job
- collections: "jsw_stock" -> "jvml_stock"; "jsw_stock_configs" -> "jvml_stock_configs"; "jsw_stock_ingestions" -> "jvml_stock_ingestions"
- KEEP the nav icon (Boxes) and the route capability the same (list = any authenticated user, config = admin).

# CRITICAL — filter count differs (10 not 12)
JSW exposes 12 per-field filters. JVML exposes EXACTLY 10. The JvmlStockField Literal (per SPEC/ADDENDUM) is, in this exact order:
  so_sales_org, sales_order_type, distr_chnl, sold_to_party, customer, material, sales_office, so_product_form, jsw_grade, nco_declared
=> When cloning the JSW analog you MUST DROP party_code and ship_to_party from any PER-FIELD FILTER context: the JvmlStockField Literal, the JvmlStockListQuery filter fields, the options endpoint, the frontend query-state, the JvmlStockFilters AsyncCombobox grid, and the controller's frozenset of allowed query keys.
=> BUT party_code and ship_to_party REMAIN data columns everywhere else: they stay in the model (col5/col6), the record DTO, the TS JvmlStock interface, the view sheet, the JvmlStockSortBy Literal (sortable), and the q free-text $or search. Do NOT delete them as columns.
- JvmlStockSortBy Literal (default created_at): created_at, report_date, customer, customer_name, party_code, sold_to_party, ship_to_party, material, jsw_grade, sales_office, so_sales_org, sales_order_type, distr_chnl, so_product_form, nco_declared, batch, unrestr_qty, stock_quantity, aging.
- q free-text $or fields (10): sold_to_party, ship_to_party, customer, party_code, customer_name, material, jsw_grade, batch, sales_order_no, sales_office.

# Authoritative field source
For the 72-column field block, the Pydantic DTO block, the TS interface block, the COLUMNS list, and the 9-group view-sheet config: copy VERBATIM from ${ADDENDUM} (it was verified field-for-field against the live workbook). If the JSW analog and ADDENDUM ever disagree on a JVML field name/type, the ADDENDUM WINS.

# Hard rules
- Create ONLY the file(s) explicitly assigned to you. Do NOT create or edit any other file. NEVER edit a jsw_stock/jsw-stock file or .planning/jsw-stock/.
- NEVER edit SHARED files (orchestrator wires them): backend models/__init__.py, core/database.py, core/scheduler.py, routes/__init__.py, services/audit/events.py, models/audit_log.py, schemas/audit_log.py, services/audit_log/options.py, services/cron/__init__.py; frontend api/client.ts, components/layout/nav-items.ts, App.tsx, pages/admin/settings/index.tsx, types/admin/audit-log.ts, components/admin/audit-logs/AuditCategoryBadge.tsx.
- You MAY assume orchestrator-added symbols already exist: putData (client.ts), audit_jvml_stock_event (services/audit/events.py), apply_jvml_stock_schedule (core/scheduler.py async), jvml_stock_poll_job re-export. Import them normally; cross-file imports from sibling builders resolve at typecheck time, not now.
- Contract: backend uses success() envelope; return success(items, meta=meta) passing the PaginationMeta OBJECT (NOT a dict). Literal sort whitelist; unknown-query-key rejection via frozenset; re.escape on all $regex; typed AppError. apply_jvml_stock_schedule is ASYNC (await it). cron import: \`from . import audited_job\`. status.py uses \`.find().sort("-created_at").limit(1).to_list()\` (no find_one sort kwarg). notify_emails: no Field(max_length); enforce 100 cap in the validator. JvmlStockListPage = DEFAULT export. Toolbar has onClearFilters prop.
- Frontend: server-driven only (no client filtering); semantic shadcn tokens; reuse shadcn ui primitives; mirror the JSW component's exact prop names.
- EVERY file MUST be <=250 lines. Full type annotations. Match the JSW analog's style exactly.
After writing, return the exact file path(s) you created and the line count of each.`

// Each task: jvml file(s) to create + exact JSW analog to clone + notes + secondary refs + job.
const T = [
  // ---------------- BACKEND (20 builders, 24 files) ----------------
  { k: 'be-model-stock', files: ['backend/app/models/jvml_stock.py'], jsw: ['backend/app/models/jsw_stock.py'], notes: ['be-model'], refs: ['backend/app/models/customer_code.py'],
    job: 'Clone the JSW model. JvmlStock Beanie Document, collection "jvml_stock". Copy the 72 data fields + 7 meta fields VERBATIM from ADDENDUM §2a (Indexed() per SPEC §1 on the indexed fields). _now_utc default factory; class Settings name="jvml_stock". Keep party_code/ship_to_party as columns. Terse docstrings, <=250 lines.' },
  { k: 'be-model-config-ingestion', files: ['backend/app/models/jvml_stock_config.py','backend/app/models/jvml_stock_ingestion.py'], jsw: ['backend/app/models/jsw_stock_config.py','backend/app/models/jsw_stock_ingestion.py'], notes: ['be-model'], refs: ['backend/app/models/region.py'],
    job: 'Clone the JSW config+ingestion models. JvmlStockConfig (collection "jvml_stock_configs": key Indexed(unique=True)="default", enabled, base_path, file_name, start_time="08:00", end_time="20:00", interval_hours=1, notify_emails list, created_at, updated_at) and JvmlStockIngestion (collection "jvml_stock_ingestions": report_date Indexed(unique=True), status, row_count=0, file_path, found_at, alerted_at, error, created_at, updated_at).' },
  { k: 'be-schema-list', files: ['backend/app/schemas/jvml_stock.py'], jsw: ['backend/app/schemas/jsw_stock.py'], notes: ['be-schema'], refs: ['backend/app/schemas/customer_code.py'],
    job: 'Clone JSW list schema but use the JVML 10-field set. JvmlStockSortBy (19 per SPEC) + JvmlStockField (the EXACT 10) Literals; JvmlStockListQuery(PageQuery) (sortBy default "created_at", q max_length=200, the 10 filter fields str|None max_length=200, dateFrom/dateTo str|None); JvmlStockOptionsQuery(field: JvmlStockField, q, limit 1..50 default 20). DROP party_code/ship_to_party from JvmlStockField and the filter fields.' },
  { k: 'be-schema-record', files: ['backend/app/schemas/jvml_stock_record.py'], jsw: ['backend/app/schemas/jsw_stock_record.py'], notes: ['be-schema'], refs: ['backend/app/schemas/customer_code.py'],
    job: 'Clone JSW record DTO. JvmlStockPublic(BaseModel): id:str + ALL 72 fields (text->str|None, number->float|None, date->datetime|None) + party_code_normalized, customer_name, customer_code_id (str|None), report_date:str, source_file:str|None, created_at:datetime, updated_at:datetime. Copy the block VERBATIM from ADDENDUM §2b.' },
  { k: 'be-schema-config', files: ['backend/app/schemas/jvml_stock_config.py'], jsw: ['backend/app/schemas/jsw_stock_config.py'], notes: ['be-schema'], refs: ['backend/app/schemas/region.py'],
    job: 'Clone JSW config schema. JvmlStockConfigPublic, JvmlStockConfigUpdate (pydantic v2 field_validators: strip base_path; file_name reject / backslash ..; start_time/end_time regex ^([01]\\\\d|2[0-3]):[0-5]\\\\d$; interval_hours 1..24; notify_emails list[EmailStr] lowercase+dedupe+cap 100 in the validator, NO Field(max_length)), JvmlStockStatusPublic, JvmlStockIngestionRow.' },
  { k: 'be-columns', files: ['backend/app/utils/jvml_stock/__init__.py','backend/app/utils/jvml_stock/columns.py'], jsw: ['backend/app/utils/jsw_stock/columns.py'], notes: ['be-columns-excel'], refs: [],
    job: 'Clone JSW columns util. utils/jvml_stock/__init__.py (empty) + columns.py: COLUMNS copied VERBATIM from ADDENDUM §2d (all 72 (header,field,type)); HEADER_TO_FIELD keyed by normalize_header; FIELD_TYPES; TEXT_FIELDS/NUMBER_FIELDS/DATE_FIELDS; normalize_header(h); coerce_value(field,raw); excel_serial_to_datetime(serial)=datetime(1899,12,30)+timedelta(days=serial). Data-only, <=250 lines.' },
  { k: 'be-excel', files: ['backend/app/utils/jvml_stock/excel.py'], jsw: ['backend/app/utils/jsw_stock/excel.py'], notes: ['be-columns-excel'], refs: ['backend/app/utils/customer_code/excel.py'],
    job: 'Clone JSW excel parser EXACTLY (it already handles this identical 72-col file incl. the malformed numeric cell and scientific-notation chemistry values). parse_workbook(data: bytes)->list[dict] using stdlib zipfile + xml.etree ONLY (NOT openpyxl); shared strings; resolve <c> by t attr; header row -> HEADER_TO_FIELD; non-floatable numeric kept raw then coerced; skip empty rows. <=250 lines.' },
  { k: 'be-query', files: ['backend/app/utils/jvml_stock/query.py'], jsw: ['backend/app/utils/jsw_stock/query.py'], notes: ['be-services-core'], refs: ['backend/app/utils/customer_code/query.py'],
    job: 'Clone JSW query builder, JVML field set. build_jvml_stock_filter(query): q $or over the 10 q-fields (sold_to_party, ship_to_party, customer, party_code, customer_name, material, jsw_grade, batch, sales_order_no, sales_office) with re.escape; per-field exact match for the 10 JvmlStockField filters; created_at $gte dateFrom/$lte dateTo via datetime.fromisoformat tolerant of trailing Z. build_sort(sort_by, sort_order)->str (+/- prefix).' },
  { k: 'be-serialize', files: ['backend/app/services/jvml_stock/__init__.py','backend/app/services/jvml_stock/serialize.py'], jsw: ['backend/app/services/jsw_stock/serialize.py'], notes: ['be-services-core'], refs: ['backend/app/services/customer_code/serialize.py'],
    job: 'Clone JSW serialize. services/jvml_stock/__init__.py (empty) + serialize.py to_jvml_stock_public(doc: JvmlStock)->JvmlStockPublic mapping EVERY field (id=str(doc.id)).' },
  { k: 'be-list', files: ['backend/app/services/jvml_stock/list.py'], jsw: ['backend/app/services/jsw_stock/list.py'], notes: ['be-services-core'], refs: ['backend/app/services/customer_code/list.py'],
    job: 'Clone JSW list service. list_jvml_stock(query: JvmlStockListQuery)->tuple[list[JvmlStockPublic], PaginationMeta]: build filter -> count -> find().sort().skip().limit() -> to_jvml_stock_public -> PaginationMeta (built exactly as JSW does).' },
  { k: 'be-options', files: ['backend/app/services/jvml_stock/options.py'], jsw: ['backend/app/services/jsw_stock/options.py'], notes: ['be-services-core'], refs: ['backend/app/services/customer_code/options.py'],
    job: 'Clone JSW options service. search_field_options(query: JvmlStockOptionsQuery)->list[AsyncOption] via JvmlStock.distinct(query.field, filt) (Beanie 2.x: filter is 2nd positional). filt={field:{"$regex":re.escape(q),"$options":"i"}} when q else {}. Drop None/empty, sort, cap at query.limit. AsyncOption from ...schemas.admin_user.' },
  { k: 'be-customer-map', files: ['backend/app/services/jvml_stock/customer_map.py'], jsw: ['backend/app/services/jsw_stock/customer_map.py'], notes: ['be-ingest-poller'], refs: ['backend/app/models/customer_code.py'],
    job: 'Clone JSW customer_map. async build_customer_map(normalized_codes: set[str])->dict[str, tuple[str|None,str|None]]: empty->{}; CustomerCode.find({"code":{"$in":list(...)}}); first match per code wins; value=(doc.customer, str(doc.id)).' },
  { k: 'be-ingest', files: ['backend/app/services/jvml_stock/ingest.py'], jsw: ['backend/app/services/jsw_stock/ingest.py'], notes: ['be-ingest-poller'], refs: ['backend/app/services/customer_code/import_rows.py'],
    job: 'Clone JSW ingest. async ingest_file(path, report_date)->int: read bytes; parse_workbook; coerce_value per field; party_code_normalized=(party_code or "").lstrip("0") or None; build_customer_map; attach customer_name/customer_code_id; set report_date, source_file=path, created/updated now UTC; idempotent JvmlStock.find({"report_date":report_date}).delete() then insert_many chunks of 1000 (count via len(chunk)); emit audit_jvml_stock_event("jvml_stock.ingested", extra={report_date,row_count}); return count.' },
  { k: 'be-poller', files: ['backend/app/services/jvml_stock/poller.py'], jsw: ['backend/app/services/jsw_stock/poller.py'], notes: ['be-ingest-poller'], refs: [],
    job: 'Clone JSW poller EXACTLY (window/filesystem logic per SPEC §2). async run_poll()->JvmlStockStatusPublic: load config; if not enabled return status; validate base_path+file_name; now=datetime.now() LOCAL; today=%d-%m-%Y; parse start/end HH:MM; if now.time()<start return; folder=join(base_path,today); makedirs(exist_ok=True); get/create JvmlStockIngestion keyed report_date; if status=="ingested" return; fpath=join(folder,file_name+".xlsx"); isfile->ingest_file+mark ingested(row_count,found_at,file_path); elif now.time()>=end and status!="alerted"->send_missing_alert(config,today)+mark alerted; else mark missing; wrap ingest in try/except->mark error+audit jvml_stock.failed; never raise; return get_status().' },
  { k: 'be-emails', files: ['backend/app/services/jvml_stock/emails.py'], jsw: ['backend/app/services/jsw_stock/emails.py'], notes: ['be-ingest-poller'], refs: ['backend/app/core/email.py'],
    job: 'Clone JSW emails. render_missing_email(report_date, file_name, base_path)->tuple[str,str,str] (subject "JVML STOCK EXCEL not found — {report_date}") and async send_missing_alert(config, report_date)->None looping config.notify_emails via core.email.send_email; emit audit_jvml_stock_event("jvml_stock.missing_alert",...); never raises.' },
  { k: 'be-config-service', files: ['backend/app/services/jvml_stock/config_service.py'], jsw: ['backend/app/services/jsw_stock/config_service.py'], notes: ['be-ingest-poller'], refs: [],
    job: 'Clone JSW config_service. async get_config()->JvmlStockConfigPublic (singleton key="default", defaults if absent) and async upsert_config(body, *, actor_email)->JvmlStockConfigPublic (find-or-create singleton, set fields, bump updated_at, save; then await apply_jvml_stock_schedule() from ...core.scheduler; emit audit_jvml_stock_event("jvml_stock.config_updated")). Local import apply_jvml_stock_schedule to avoid cycles.' },
  { k: 'be-status', files: ['backend/app/services/jvml_stock/status.py'], jsw: ['backend/app/services/jsw_stock/status.py'], notes: ['be-ingest-poller'], refs: [],
    job: 'Clone JSW status. async get_status()->JvmlStockStatusPublic: read config.enabled; latest JvmlStockIngestion via .find().sort("-created_at").limit(1).to_list() + recent 14 by created_at desc -> JvmlStockIngestionRow list; populate last_* from most recent.' },
  { k: 'be-cron', files: ['backend/app/services/cron/jvml_stock.py'], jsw: ['backend/app/services/cron/jsw_stock.py'], notes: ['be-ingest-poller'], refs: ['backend/app/services/cron/heartbeat.py'],
    job: 'Clone JSW cron job. from . import audited_job; @audited_job("cron.jvml_stock_poll") async def jvml_stock_poll_job()->None: local import run_poll from ...services.jvml_stock.poller; await run_poll().' },
  { k: 'be-controllers', files: ['backend/app/controllers/jvml_stock.py','backend/app/controllers/jvml_stock_config.py'], jsw: ['backend/app/controllers/jsw_stock.py','backend/app/controllers/jsw_stock_config.py'], notes: ['be-controller-routes'], refs: ['backend/app/controllers/customer_code.py'],
    job: 'Clone JSW controllers, JVML 10-filter frozenset. controllers/jvml_stock.py (list_jvml_stock_controller + field_options_controller; list allowed={page,limit,sortBy,sortOrder,q,dateFrom,dateTo}+the 10 filters; options allowed={field,q,limit}; return success(items, meta=meta)) and controllers/jvml_stock_config.py (get_config_controller, update_config_controller(body, current_admin) threads .emailid, get_status_controller, run_now_controller calling run_poll). Match JSW controller signatures EXACTLY.' },
  { k: 'be-routes', files: ['backend/app/routes/jvml_stock.py'], jsw: ['backend/app/routes/jsw_stock.py'], notes: ['be-controller-routes'], refs: ['backend/app/routes/customer_code.py'],
    job: 'Clone JSW routes. TWO exported routers: router=APIRouter(prefix="/jvml-stock", tags=["jvml-stock"], dependencies=[Depends(get_current_user)]) with GET "" (list) and GET "/options" (registered before any param route); config_router=APIRouter(prefix="/admin/jvml-stock", tags=["jvml-stock-admin"], dependencies=[Depends(get_current_admin)]) with GET "/config", PUT "/config", GET "/status", POST "/run-now". response_model=SuccessEnvelope[...].' },

  // ---------------- FRONTEND (15 builders, 21 files) ----------------
  { k: 'fe-types-stock', files: ['frontend/src/types/jvml-stock/stock.ts'], jsw: ['frontend/src/types/jsw-stock/stock.ts'], notes: ['fe-types-api'], refs: ['frontend/src/types/admin/customer-code.ts'],
    job: 'Clone JSW stock types, JVML 10-field set. JvmlStockSortBy, JvmlStockField (EXACT 10) unions; JvmlStock interface = id + ALL 72 fields (text->string|null, number->number|null, date->string|null) + party_code_normalized, customer_name, customer_code_id (string|null), report_date:string, source_file:string|null, created_at:string, updated_at:string (copy TS block VERBATIM from ADDENDUM §2c); JvmlStockListQuery extends PageQuery with sortBy?, q?, the 10 filters?, dateFrom?, dateTo?. Keep party_code/ship_to_party as interface fields.' },
  { k: 'fe-types-ui', files: ['frontend/src/types/jvml-stock/stock-ui.ts'], jsw: ['frontend/src/types/jsw-stock/stock-ui.ts'], notes: ['fe-types-api'], refs: ['frontend/src/types/admin/customer-code-ui.ts'],
    job: 'Clone JSW stock-ui. JvmlStockQueryState (10 filters), JvmlStockDialogState ({type:"none"}|{type:"view";row:JvmlStock}), prop interfaces for table/toolbar(+onClearFilters)/filters/pagination/view-sheet, UseJvmlStockListResult. Match JSW prop names exactly.' },
  { k: 'fe-types-config', files: ['frontend/src/types/settings/jvml-stock-config.ts','frontend/src/types/settings/jvml-stock-config-ui.ts'], jsw: ['frontend/src/types/settings/jsw-stock-config.ts','frontend/src/types/settings/jsw-stock-config-ui.ts'], notes: ['fe-types-api','fe-settings'], refs: [],
    job: 'Clone JSW config types. jvml-stock-config.ts (JvmlStockConfig {enabled,base_path,file_name,start_time,end_time,interval_hours,notify_emails:string[],updated_at:string|null}, JvmlStockConfigInput=same minus updated_at, JvmlStockStatus {enabled,last_report_date,last_status,last_row_count,last_found_at,last_alerted_at,last_error,recent:JvmlStockIngestionRow[]}, JvmlStockIngestionRow) and jvml-stock-config-ui.ts (form prop contracts + UseJvmlStockConfigResult).' },
  { k: 'fe-api-list', files: ['frontend/src/api/jvml-stock/list.ts','frontend/src/api/jvml-stock/options.ts'], jsw: ['frontend/src/api/jsw-stock/list.ts','frontend/src/api/jsw-stock/options.ts'], notes: ['fe-types-api'], refs: ['frontend/src/api/admin/customer-codes/list.ts','frontend/src/api/admin/customer-codes/options.ts'],
    job: 'Clone JSW api. list.ts listJvmlStock(query): Promise<PaginatedResult<JvmlStock>> via getList+buildQuery forwarding dateFrom/dateTo and the 10 filters (strip empty). options.ts searchJvmlStockFieldOptions(field): (q)=>Promise<AsyncOption[]> curried factory hitting /jvml-stock/options?field=&q=&limit=20.' },
  { k: 'fe-api-config', files: ['frontend/src/api/settings/jvml-stock-config/get.ts','frontend/src/api/settings/jvml-stock-config/update.ts','frontend/src/api/settings/jvml-stock-config/status.ts','frontend/src/api/settings/jvml-stock-config/runNow.ts'], jsw: ['frontend/src/api/settings/jsw-stock-config/get.ts','frontend/src/api/settings/jsw-stock-config/update.ts','frontend/src/api/settings/jsw-stock-config/status.ts','frontend/src/api/settings/jsw-stock-config/runNow.ts'], notes: ['fe-types-api'], refs: ['frontend/src/api/admin/customer-codes/get.ts'],
    job: 'Clone JSW 4 config api files. get.ts getJvmlStockConfig()->getData "/admin/jvml-stock/config"; update.ts updateJvmlStockConfig(body)->putData "/admin/jvml-stock/config"; status.ts getJvmlStockStatus()->getData "/admin/jvml-stock/status"; runNow.ts runJvmlStockCheckNow()->postData "/admin/jvml-stock/run-now", {}. Import helpers from @/api/client (putData assumed present).' },
  { k: 'fe-table', files: ['frontend/src/components/jvml-stock/JvmlStockTable.tsx'], jsw: ['frontend/src/components/jsw-stock/JswStockTable.tsx'], notes: ['fe-table-pagination'], refs: ['frontend/src/components/admin/customer-codes/CustomerCodeTable.tsx'],
    job: 'Clone JSW table. Sortable server table: Report Date · Party Code · Customer · Customer Name (italic muted when null) · Sold To Party · Material · JSW Grade · Sales Office · Distr.Chnl · Unrestr Qty (tabular-nums) · Stock Qty · view action. Sort only on whitelist columns. Loading skeleton + empty (Boxes icon) + error states. <=250 lines.' },
  { k: 'fe-pagination', files: ['frontend/src/components/jvml-stock/JvmlStockTablePagination.tsx'], jsw: ['frontend/src/components/jsw-stock/JswStockTablePagination.tsx'], notes: ['fe-table-pagination'], refs: ['frontend/src/components/admin/customer-codes/CustomerCodeTablePagination.tsx'],
    job: 'Clone JSW pagination (prop isLoading; label "stock row"/"stock rows").' },
  { k: 'fe-toolbar', files: ['frontend/src/components/jvml-stock/JvmlStockTableToolbar.tsx'], jsw: ['frontend/src/components/jsw-stock/JswStockTableToolbar.tsx'], notes: ['fe-toolbar-filters'], refs: ['frontend/src/components/admin/customer-codes/CustomerCodeTableToolbar.tsx'],
    job: 'Clone JSW toolbar. Debounced free-text search (q) + DateRangePicker (dateFrom/dateTo on createdAt) + JvmlStockFilters popover trigger with active-count badge + onClearFilters prop. Use the exact DateRangePicker prop names the JSW toolbar uses.' },
  { k: 'fe-filters', files: ['frontend/src/components/jvml-stock/JvmlStockFilters.tsx'], jsw: ['frontend/src/components/jsw-stock/JswStockFilters.tsx'], notes: ['fe-toolbar-filters'], refs: ['frontend/src/components/admin/customer-codes/CustomerCodeFilters.tsx'],
    job: 'Clone JSW filters but render EXACTLY 10 AsyncCombobox filters (one per JvmlStockField — NOT party_code, NOT ship_to_party), module-level frozen FETCHERS from searchJvmlStockFieldOptions(field), Clear all, active-count badge. Use the exact AsyncCombobox prop names the JSW filters use. <=250 lines.' },
  { k: 'fe-fields-config', files: ['frontend/src/components/jvml-stock/jvml-stock-fields.ts'], jsw: ['frontend/src/components/jsw-stock/jsw-stock-fields.ts'], notes: ['fe-viewsheet'], refs: [],
    job: 'Clone JSW fields config. Export the 9-group config (Order & SO · Customer & Mapping · Material & Dimensions · Quantities · Quality/NCO · Chemistry (%) · Mechanical · Logistics/Export · Meta) as {group; fields:{key: keyof JvmlStock; label; kind:"text"|"number"|"date"|"datetime"|"mono"}[]}[]. Copy the grouping VERBATIM from ADDENDUM §3. Every JvmlStock field appears exactly once.' },
  { k: 'fe-viewsheet', files: ['frontend/src/components/jvml-stock/ViewJvmlStockSheet.tsx'], jsw: ['frontend/src/components/jsw-stock/ViewJswStockSheet.tsx'], notes: ['fe-viewsheet'], refs: ['frontend/src/components/admin/customer-codes/ViewCustomerCodeSheet.tsx'],
    job: 'Clone JSW view sheet. shadcn Sheet (right, scrollable) rendering the 9 groups from jvml-stock-fields.ts via a generic <Field label value> renderer (— for null; date/datetime via date-fns). <=250 lines.' },
  { k: 'fe-hook', files: ['frontend/src/components/jvml-stock/hooks/useJvmlStockList.ts'], jsw: ['frontend/src/components/jsw-stock/hooks/useJswStockList.ts'], notes: ['fe-hook-page'], refs: ['frontend/src/components/admin/customer-codes/hooks/useCustomerCodeManagement.ts'],
    job: 'Clone JSW hook, JVML 10 filters. useJvmlStockList: query state {page,limit,sortBy,sortOrder,q,10 filters,dateFrom,dateTo}, rows/meta/loading/error, dialog union; setters setPage/setLimit/setSort/setSearch/setFilter/setDateRange/clearFilters/refetch/openDialog/closeDialog; race-safe fetchIdRef calling listJvmlStock.' },
  { k: 'fe-page', files: ['frontend/src/pages/jvml-stock/index.tsx'], jsw: ['frontend/src/pages/jsw-stock/index.tsx'], notes: ['fe-hook-page'], refs: ['frontend/src/pages/admin/customer-codes/index.tsx'],
    job: 'Clone JSW page. DEFAULT-export JvmlStockListPage: header (icon chip Boxes + "JVML Stock List" + subtitle), JvmlStockTableToolbar, JvmlStockTable, JvmlStockTablePagination, ViewJvmlStockSheet — thin orchestrator wired to useJvmlStockList. MUST be `export default`.' },
  { k: 'fe-settings-status', files: ['frontend/src/components/settings/JvmlStockConfigStatus.tsx'], jsw: ['frontend/src/components/settings/JswStockConfigStatus.tsx'], notes: ['fe-settings'], refs: [],
    job: 'Clone JSW status panel. JvmlStockConfigStatus taking JvmlStockStatus — enabled badge, last run report_date/status/row_count, last_found_at, last_error. shadcn Badge + semantic tokens. <=250 lines.' },
  { k: 'fe-settings-card', files: ['frontend/src/components/settings/JvmlStockConfigCard.tsx','frontend/src/components/settings/hooks/useJvmlStockConfig.ts'], jsw: ['frontend/src/components/settings/JswStockConfigCard.tsx','frontend/src/components/settings/hooks/useJswStockConfig.ts'], notes: ['fe-settings'], refs: ['frontend/src/components/admin/regions/EmailChipInput.tsx'],
    job: 'Clone JSW settings card+hook. useJvmlStockConfig.ts (load config+status on mount, form state, save() via updateJvmlStockConfig, runNow() via runJvmlStockCheckNow, loading/saving/error flags, sonner toasts) and JvmlStockConfigCard.tsx (Card "JVML Stock Excel Configuration" + helper "<base_path>/<dd-mm-yyyy>/<file_name>.xlsx"; Switch enabled; Input base_path; Input file_name (+.xlsx hint); start/end Input type="time"; interval Select 1..24 "Every N hour(s)"; reuse @/components/admin/regions/EmailChipInput for notify_emails; footer "Run check now" secondary + "Save configuration" primary aria-busy; render <JvmlStockConfigStatus> below; client validate start<end & file_name has no / or backslash). Both <=250 lines.' },
]

phase('Build')
const built = await parallel(T.map((t) => () =>
  agent(
    `You are builder "${t.k}" for the JVML Stock feature.\n${GUARD}\n\nCREATE EXACTLY THESE FILE(S):\n- ${t.files.join('\n- ')}\n\nPRIMARY MIRROR — clone this exact-analog JSW file (read it, then rename jsw->jvml per the rename map):\n- ${t.jsw.join('\n- ')}\n\nAUTHORITATIVE FIELD SOURCE (verbatim field/column/grouping blocks): ${ADDENDUM}\nNOTES (deeper rationale + corrections): ${t.notes.map((n) => `${NOTES}/${n}.md`).join(', ')}\nSECONDARY REFERENCE (different domain — only for envelope/pagination idioms if the JSW file is ambiguous): ${t.refs.length ? t.refs.join(', ') : '(none)'}\nSPEC: ${SPEC}\n\nTASK: ${t.job}`,
    { label: t.k, phase: 'Build' }
  )
))

const ok = built.filter(Boolean).length
log(`Builders done: ${ok}/${T.length}`)
return { builders: ok, total: T.length, files: T.flatMap((t) => t.files) }

export const meta = {
  name: 'customer-code-management',
  description: 'Build Customer Code Management (admin CRUD + Excel import + region link) end-to-end by mirroring the Region domain',
  phases: [
    { title: 'Audit' },
    { title: 'Synthesize' },
    { title: 'Build-Contracts' },
    { title: 'Build-Impl' },
    { title: 'Wire' },
    { title: 'Verify' },
  ],
}

const ROOT = '/DATA/CODE_FILES/MARKETING REPORT AUTOMATION'
const BE = ROOT + '/backend/app'
const FE = ROOT + '/frontend/src'
const SPEC = ROOT + '/.planning/customer-codes/SPEC.md'
const ADDENDUM = ROOT + '/.planning/customer-codes/ADDENDUM.md'

const FINDING = {
  type: 'object',
  properties: {
    area: { type: 'string' },
    confirmed: { type: 'boolean' },
    blockers: { type: 'array', items: { type: 'string' } },
    builder_notes: { type: 'string', description: 'Exact signatures/snippets/corrections builders must apply' },
  },
  required: ['area', 'confirmed', 'blockers', 'builder_notes'],
  additionalProperties: false,
}
const BUILD = {
  type: 'object',
  properties: {
    file: { type: 'string' },
    status: { type: 'string', enum: ['done', 'failed'] },
    lines: { type: 'number' },
    notes: { type: 'string' },
  },
  required: ['file', 'status', 'lines', 'notes'],
  additionalProperties: false,
}
const VERIFY = {
  type: 'object',
  properties: {
    check: { type: 'string' },
    passed: { type: 'boolean' },
    details: { type: 'string' },
  },
  required: ['check', 'passed', 'details'],
  additionalProperties: false,
}

function builderPrompt(t) {
  const lines = [
    'You are a Phase-2 builder writing ONE part of the Customer Code Management feature. Repo root: ' + ROOT + '.',
    'MANDATORY reads, in order:',
    '1. SPEC: ' + SPEC + ' (focus on ' + t.section + ' and Golden Rules section 0).',
    '2. ADDENDUM (audit gap-fixes): ' + ADDENDUM + ' (apply any correction for your file).',
    '3. REFERENCE file to mirror: ' + t.ref,
  ]
  if (t.extra) lines.push('4. Also read: ' + t.extra)
  lines.push('')
  lines.push('Then WRITE the target file(s): ' + t.target)
  if (t.note) lines.push('Special instructions: ' + t.note)
  lines.push('Rules: mirror the reference structure/idioms/docstring density exactly; implement the SPEC contract precisely (exact field/prop/type/query-key names); full type annotations; production quality, NO TODO/placeholder; each file <= 250 lines. Only Write your target file(s) — do NOT edit shared or other files, do NOT run builds.')
  lines.push('Return the structured result.')
  return lines.join('\n')
}

function auditPrompt(a) {
  const lines = [
    'You are a Phase-1 audit agent grounding a build SPEC in real reference code for the Customer Code Management feature. Repo root: ' + ROOT + '.',
    'Read the SPEC first: ' + SPEC + ' (especially Golden Rules section 0).',
  ]
  if (a.refs.length) lines.push('Read these reference files: ' + a.refs.join(', ') + '.')
  lines.push('TASK: ' + a.ask)
  lines.push('Be exact and build-ready. List blockers (contract gaps, wrong assumptions). Put concrete code snippets/signatures in builder_notes. Do NOT write any files.')
  return lines.join('\n')
}

// ---------------------------------------------------------------- PHASE 1
phase('Audit')
const auditAreas = [
  { id: 'be-model-schema', refs: [BE + '/models/region.py', BE + '/schemas/region.py', BE + '/schemas/common.py', BE + '/utils/region/query.py'],
    ask: 'Verify SPEC sections 1, 2.1-2.3: model field types (code and region_id as str, Indexed usage), PageQuery extension, Literal sort whitelist, the field_validator(mode=before) strip/normalize pattern. Provide the exact CustomerCodeCreate/Update validator code builders should use (strip strings, empty optional -> None).' },
  { id: 'be-services', refs: [BE + '/services/region/create.py', BE + '/services/region/list.py', BE + '/services/region/get.py', BE + '/services/region/update.py', BE + '/services/region/delete.py', BE + '/services/region/options.py', BE + '/services/region/serialize.py'],
    ask: 'Verify SPEC section 2.5 per-action service signatures. Provide the EXACT update.py and delete.py patterns (load doc, 404, mutate, save, audit). Confirm Beanie 2.x Model.distinct(key, filter) classmethod usage and whether insert_many exists in Beanie 2.x (give the exact bulk-insert call or a safe loop fallback).' },
  { id: 'be-routes-ctrl', refs: [BE + '/routes/region.py', BE + '/routes/audit_log.py', BE + '/controllers/region.py', BE + '/core/responses.py', BE + '/core/auth_deps.py', BE + '/schemas/auth.py'],
    ask: 'Verify SPEC sections 2.6-2.7: route registration order (literal before /{id}), router-level admin dep, frozenset unknown-key rejection, success() usage. Provide the exact FastAPI import + signature for the multipart import controller (UploadFile=File(...), region_id=Form(...)) and the StreamingResponse template controller (imports + headers).' },
  { id: 'be-audit', refs: [BE + '/services/audit/events.py', BE + '/models/audit_log.py', BE + '/schemas/audit_log.py', BE + '/services/audit_log/options.py'],
    ask: 'Verify SPEC sections 3.5-3.8: exact edits to add a customer_codes audit category (model + schema Literals + _CATEGORIES) and the audit_customer_code_event helper. Confirm the schemas/audit_log.py AuditCategory Literal location.' },
  { id: 'be-excel', refs: [ROOT + '/backend/requirements.txt', BE + '/middleware/audit.py'],
    ask: 'Verify SPEC sections 2.4-2.5 import/template feasibility: python-multipart present, confirm the exact openpyxl read pattern (BytesIO + read_only + data_only), the lazy-import approach so import app.main works without openpyxl installed, file-size/row caps, and that the audit middleware tolerates multipart + binary responses. Recommend the openpyxl version pin to add.' },
  { id: 'be-wiring', refs: [BE + '/models/__init__.py', BE + '/core/database.py', BE + '/routes/__init__.py', ROOT + '/backend/requirements.txt'],
    ask: 'Print the EXACT current content of these shared files and the precise edits for SPEC sections 3.1-3.4 (export CustomerCode, add to DOCUMENT_MODELS plus its import line, include the customer_code router, add an openpyxl pin such as 3.1.5).' },
  { id: 'fe-types-api', refs: [FE + '/types/admin/region.ts', FE + '/types/api/envelope.ts', FE + '/types/admin/options.ts', FE + '/api/client.ts', FE + '/api/admin/regions/list.ts', FE + '/api/admin/regions/options.ts', FE + '/api/admin/regions/create.ts', FE + '/types/api/error.ts'],
    ask: 'Verify SPEC sections 4.1-4.2. Provide the exact raw-fetch pattern for import.ts (FormData with file + region_id, credentials include, no manual Content-Type, parse envelope, throw ApiError) and template.ts (blob download via anchor). Confirm the ApiError import path and Envelope typing.' },
  { id: 'fe-components', refs: [FE + '/components/admin/regions/RegionTable.tsx', FE + '/components/admin/regions/RegionTableToolbar.tsx', FE + '/components/admin/regions/RegionTablePagination.tsx', FE + '/components/admin/regions/RowActionsMenu.tsx', FE + '/components/common/AsyncCombobox.tsx', FE + '/components/common/FilterCombobox.tsx', FE + '/components/admin/audit-logs/AuditCategoryBadge.tsx'],
    ask: 'Verify SPEC section 4.3 component contracts. Confirm the AsyncCombobox fetcher signature ((q)=>Promise<AsyncOption[]>) and how the toolbar maps a chosen option to the list q. Give the SegmentBadge color-map approach mirroring AuditCategoryBadge.' },
  { id: 'fe-dialogs-page', refs: [FE + '/components/admin/regions/CreateRegionDialog.tsx', FE + '/components/admin/regions/EditRegionDialog.tsx', FE + '/components/admin/regions/ViewRegionSheet.tsx', FE + '/components/admin/regions/hooks/useRegionManagement.ts', FE + '/components/admin/regions/hooks/useRegionMutations.ts', FE + '/pages/admin/regions/index.tsx', FE + '/components/admin/shared/AdminPageHeader.tsx', FE + '/components/admin/users/ConfirmActionDialog.tsx'],
    ask: 'Verify SPEC sections 4.3-4.4: dialog form structure (Field/FieldLabel/FieldError), sonner toast usage, the useXManagement/useXMutations split + return shapes, page composition with AdminPageHeader and ConfirmActionDialog (delete variant). Provide the hook return contract builders must implement.' },
  { id: 'fe-wiring', refs: [FE + '/App.tsx', FE + '/components/layout/nav-items.ts', FE + '/types/admin/audit-log.ts', FE + '/components/admin/audit-logs/AuditCategoryBadge.tsx'],
    ask: 'Print exact current content + precise edits for SPEC section 4.5 (route, nav item with a lucide icon not already used in nav-items which currently uses LayoutDashboard, UsersRound, ScrollText, MapPin - suggest Boxes or Building2; plus add customer_codes to the FE AuditCategory union + a badge color mapping).' },
  { id: 'excel-shape', refs: [],
    ask: 'Re-open the source workbook with python (openpyxl, data_only=True) at this path: ' + ROOT + '/macro_files/west  central customer codes.xlsx . Confirm row-1 headers verbatim, that numeric code/mob/ship_to cells coerce cleanly to strings, that code repeats across rows (no uniqueness), and produce the FINAL normalized HEADER_MAP dict (normalized header -> model field) handling the CAM trailing space, MOB No., and the exact ship to vs ship to customer distinction. Use Bash to run python.' },
  { id: 'design-ux', refs: [FE + '/components/admin/regions/RegionTable.tsx', FE + '/components/admin/shared/AdminPageHeader.tsx', FE + '/index.css'],
    ask: 'Apply senior UI/UX judgment (ui-ux-pro-max / impeccable principles). Produce a concrete premium-polish checklist for the Customer Codes page guaranteeing visual parity with Region/User/Audit pages and avoiding AI-slop: table density and column choice, SegmentBadge palette (quiet semantic tints), import-dialog guided flow, toolbar layout, spacing scale, truncation+tooltip rule, empty/loading/error states, dark-mode + focus-visible + a11y labels. Output as do/dont bullets builders must follow.' },
]
const findings = (await parallel(auditAreas.map((a) => () =>
  agent(auditPrompt(a), { label: 'audit:' + a.id, phase: 'Audit', schema: FINDING }),
))).filter(Boolean)

// ---------------------------------------------------------------- PHASE 1b
phase('Synthesize')
const synthLines = [
  'Synthesize Phase-1 audit findings into a build ADDENDUM for the Customer Code Management feature.',
  'Read the SPEC: ' + SPEC + '.',
  'Here are the audit findings as JSON:',
  JSON.stringify(findings, null, 2),
  '',
  'Write a single markdown file to: ' + ADDENDUM,
  'It MUST contain:',
  '1. "## Blockers & Resolutions" — every blocker from findings with a concrete resolution (or mark non-blocking).',
  '2. "## Builder Notes" — exact signatures/snippets/corrections grouped by file path (e.g. the update.py/delete.py service pattern, the multipart controller signature, the StreamingResponse usage, the raw-fetch import/template FE pattern, the final HEADER_MAP, the hook return contract, the audit category edits).',
  '3. "## Go/No-Go" — a one-line verdict (must be GO unless a hard blocker remains).',
  'Keep it precise and actionable — Phase-2 builders rely on it. Confirm the file was written.',
]
await agent(synthLines.join('\n'), { label: 'synthesize', phase: 'Synthesize' })

// ---------------------------------------------------------------- PHASE 2a
phase('Build-Contracts')
const contracts = [
  { id: 'be-model', target: BE + '/models/customer_code.py', ref: BE + '/models/region.py', section: 'section 2.1' },
  { id: 'be-schema', target: BE + '/schemas/customer_code.py', ref: BE + '/schemas/region.py', section: 'sections 1, 2.2', extra: BE + '/schemas/admin_user.py (for AsyncOption import) and ' + BE + '/schemas/common.py' },
  { id: 'be-utils-init', target: BE + '/utils/customer_code/__init__.py', ref: BE + '/utils/region/__init__.py', section: 'section 2.3' },
  { id: 'be-utils-query', target: BE + '/utils/customer_code/query.py', ref: BE + '/utils/region/query.py', section: 'section 2.3' },
  { id: 'be-utils-excel', target: BE + '/utils/customer_code/excel.py', ref: BE + '/utils/region/query.py', section: 'section 2.4', note: 'New file, no direct analog. Import openpyxl LAZILY inside functions. Implement HEADER_MAP/normalize_header/cell_to_str/parse_workbook exactly per SPEC 2.4 and the ADDENDUM final HEADER_MAP.' },
  { id: 'fe-types', target: FE + '/types/admin/customer-code.ts', ref: FE + '/types/admin/region.ts', section: 'section 4.1' },
  { id: 'fe-types-ui', target: FE + '/types/admin/customer-code-ui.ts', ref: FE + '/types/admin/region-ui.ts', section: 'section 4.1' },
  { id: 'fe-api-list', target: FE + '/api/admin/customer-codes/list.ts', ref: FE + '/api/admin/regions/list.ts', section: 'section 4.2' },
  { id: 'fe-api-crud', target: FE + '/api/admin/customer-codes/get.ts and create.ts and update.ts and remove.ts (all four)', ref: FE + '/api/admin/regions/get.ts plus create.ts plus update.ts plus remove.ts', section: 'section 4.2', note: 'Write ALL FOUR small files, each mirroring the same-named region file.' },
  { id: 'fe-api-options', target: FE + '/api/admin/customer-codes/options.ts', ref: FE + '/api/admin/regions/options.ts', section: 'section 4.2', note: 'Export a CURRIED factory searchCustomerCodeFieldOptions(field) that returns (q)=>Promise<AsyncOption[]>.' },
  { id: 'fe-api-import', target: FE + '/api/admin/customer-codes/import.ts', ref: FE + '/api/client.ts', section: 'section 4.2', note: 'Raw fetch + FormData (file + region_id), bypass apiClient, parse the envelope, throw ApiError. Document why apiClient is bypassed.' },
  { id: 'fe-api-template', target: FE + '/api/admin/customer-codes/template.ts', ref: FE + '/api/client.ts', section: 'section 4.2', note: 'Raw fetch then blob then anchor download (customer_codes_template.xlsx).' },
]
await parallel(contracts.map((t) => () => agent(builderPrompt(t), { label: 'build:' + t.id, phase: 'Build-Contracts', schema: BUILD })))

// ---------------------------------------------------------------- PHASE 2b
phase('Build-Impl')
const impl = [
  { id: 'be-svc-init', target: BE + '/services/customer_code/__init__.py', ref: BE + '/services/region/__init__.py', section: 'section 2.5' },
  { id: 'be-svc-serialize', target: BE + '/services/customer_code/serialize.py', ref: BE + '/services/region/serialize.py', section: 'section 2.5' },
  { id: 'be-svc-regionlink', target: BE + '/services/customer_code/region_link.py', ref: BE + '/services/region/get.py', section: 'section 2.5', note: 'New helper: resolve_region_or_400, region_name_map (batch with $in), region_name_for. Use beanie PydanticObjectId + core.errors.ValidationError/NotFoundError + models.region.Region.' },
  { id: 'be-svc-list', target: BE + '/services/customer_code/list.py', ref: BE + '/services/region/list.py', section: 'section 2.5', note: 'After fetching docs, batch-resolve region names via region_link.region_name_map and pass each into serialize.' },
  { id: 'be-svc-get', target: BE + '/services/customer_code/get.py', ref: BE + '/services/region/get.py', section: 'section 2.5' },
  { id: 'be-svc-create', target: BE + '/services/customer_code/create.py', ref: BE + '/services/region/create.py', section: 'section 2.5', note: 'No uniqueness check. Validate region via region_link.resolve_region_or_400. Emit audit_customer_code_event customer_code.created.' },
  { id: 'be-svc-update', target: BE + '/services/customer_code/update.py', ref: BE + '/services/region/update.py', section: 'section 2.5' },
  { id: 'be-svc-delete', target: BE + '/services/customer_code/delete.py', ref: BE + '/services/region/delete.py', section: 'section 2.5' },
  { id: 'be-svc-options', target: BE + '/services/customer_code/options.py', ref: BE + '/services/region/options.py', section: 'section 2.5', note: 'Use Beanie classmethod CustomerCode.distinct(field, filt); dedupe/sort/cap in python.' },
  { id: 'be-svc-import', target: BE + '/services/customer_code/import_rows.py', ref: BE + '/services/region/create.py', section: 'section 2.5', extra: BE + '/utils/customer_code/excel.py (read it, it already exists)', note: 'New: parse via utils.excel.parse_workbook, validate region, bulk insert per ADDENDUM pattern, emit audit_customer_code_event customer_code.imported, return CustomerCodeImportResult.' },
  { id: 'be-svc-template', target: BE + '/services/customer_code/template.py', ref: BE + '/services/region/serialize.py', section: 'section 2.5', note: 'New: build_template_workbook() returns bytes; lazy openpyxl; canonical headers per SPEC 2.5.' },
  { id: 'be-controller', target: BE + '/controllers/customer_code.py', ref: BE + '/controllers/region.py', section: 'section 2.6', note: 'Also add import (multipart) + template (StreamingResponse) controllers per ADDENDUM signatures.' },
  { id: 'be-routes', target: BE + '/routes/customer_code.py', ref: BE + '/routes/region.py', section: 'section 2.7', extra: BE + '/routes/audit_log.py', note: 'Registration order: list, options, template (no response_model), import, create (201), then /{code_id} GET/PATCH/DELETE.' },
  { id: 'fe-segbadge', target: FE + '/components/admin/customer-codes/SegmentBadge.tsx', ref: FE + '/components/admin/audit-logs/AuditCategoryBadge.tsx', section: 'section 4.3' },
  { id: 'fe-table', target: FE + '/components/admin/customer-codes/CustomerCodeTable.tsx', ref: FE + '/components/admin/regions/RegionTable.tsx', section: 'section 4.3', note: 'Columns: Segment (badge), Code, Customer, Destination, Region, CAM, ROUTE, actions; sortable headers only for the whitelist.' },
  { id: 'fe-pagination', target: FE + '/components/admin/customer-codes/CustomerCodeTablePagination.tsx', ref: FE + '/components/admin/regions/RegionTablePagination.tsx', section: 'section 4.3' },
  { id: 'fe-rowactions', target: FE + '/components/admin/customer-codes/RowActionsMenu.tsx', ref: FE + '/components/admin/regions/RowActionsMenu.tsx', section: 'section 4.3', note: 'View / Edit / Delete only.' },
  { id: 'fe-toolbar', target: FE + '/components/admin/customer-codes/CustomerCodeTableToolbar.tsx', ref: FE + '/components/admin/regions/RegionTableToolbar.tsx', section: 'section 4.3', extra: FE + '/api/admin/regions/options.ts', note: 'Search (sets q) + Region AsyncCombobox filter + Filters button + Import button + Download-template button + New button.' },
  { id: 'fe-filters', target: FE + '/components/admin/customer-codes/CustomerCodeFilters.tsx', ref: FE + '/components/common/AsyncCombobox.tsx', section: 'section 4.3', note: 'New: Popover with one clearable AsyncCombobox per field via a field->label config array; patches query; Clear all.' },
  { id: 'fe-create', target: FE + '/components/admin/customer-codes/CreateCustomerCodeDialog.tsx', ref: FE + '/components/admin/regions/CreateRegionDialog.tsx', section: 'section 4.3', note: 'Required Segment/Code/Customer/Destination + required Region AsyncCombobox + optional fields. May split fields into CustomerCodeFormFields.tsx if over 250 lines.' },
  { id: 'fe-edit', target: FE + '/components/admin/customer-codes/EditCustomerCodeDialog.tsx', ref: FE + '/components/admin/regions/EditRegionDialog.tsx', section: 'section 4.3' },
  { id: 'fe-view', target: FE + '/components/admin/customer-codes/ViewCustomerCodeSheet.tsx', ref: FE + '/components/admin/regions/ViewRegionSheet.tsx', section: 'section 4.3' },
  { id: 'fe-import', target: FE + '/components/admin/customer-codes/ImportCustomerCodesDialog.tsx', ref: FE + '/components/admin/regions/CreateRegionDialog.tsx', section: 'section 4.3', extra: FE + '/api/admin/regions/options.ts', note: 'New: required Region AsyncCombobox + file input accept .xlsx + download-template link + Import button; show Progress while uploading; render CustomerCodeImportResult summary; call onImported to refetch.' },
  { id: 'fe-hook-mgmt', target: FE + '/components/admin/customer-codes/hooks/useCustomerCodeManagement.ts', ref: FE + '/components/admin/regions/hooks/useRegionManagement.ts', section: 'section 4.3' },
  { id: 'fe-hook-mut', target: FE + '/components/admin/customer-codes/hooks/useCustomerCodeMutations.ts', ref: FE + '/components/admin/regions/hooks/useRegionMutations.ts', section: 'section 4.3', note: 'create/update/delete/import with sonner toasts.' },
  { id: 'fe-page', target: FE + '/pages/admin/customer-codes/index.tsx', ref: FE + '/pages/admin/regions/index.tsx', section: 'section 4.4', note: 'Export CustomerCodeManagementPage; include the Import dialog + ConfirmActionDialog (delete).' },
]
await parallel(impl.map((t) => () => agent(builderPrompt(t), { label: 'build:' + t.id, phase: 'Build-Impl', schema: BUILD })))

// ---------------------------------------------------------------- PHASE 3
phase('Wire')
const beWire = [
  'Phase-3 BACKEND wiring for Customer Code Management. Repo root: ' + ROOT + '. Read ' + SPEC + ' section 3 and ' + ADDENDUM + '.',
  'Apply these edits to SHARED backend files (use Edit, preserve formatting):',
  '1. ' + BE + '/models/__init__.py — export CustomerCode.',
  '2. ' + BE + '/core/database.py — add CustomerCode to the models import line and to DOCUMENT_MODELS.',
  '3. ' + BE + '/routes/__init__.py — import customer_code and api_router.include_router(customer_code.router).',
  '4. ' + ROOT + '/backend/requirements.txt — add an openpyxl pin per the ADDENDUM.',
  '5. ' + BE + '/models/audit_log.py — add customer_codes to the AuditCategory Literal.',
  '6. ' + BE + '/schemas/audit_log.py — add customer_codes to its AuditCategory Literal.',
  '7. ' + BE + '/services/audit_log/options.py — add customer_codes to _CATEGORIES.',
  '8. ' + BE + '/services/audit/events.py — add audit_customer_code_event mirroring audit_region_event (category customer_codes, source service).',
  'Make ONLY these edits. Return the structured result with file set to backend-wiring.',
]
const feWire = [
  'Phase-3 FRONTEND wiring for Customer Code Management. Repo root: ' + ROOT + '. Read ' + SPEC + ' section 4.5 and ' + ADDENDUM + '.',
  'Apply these edits to SHARED frontend files (use Edit, preserve formatting):',
  '1. ' + FE + '/App.tsx — import CustomerCodeManagementPage from @/pages/admin/customer-codes and add a Route path /admin/customer-codes element CustomerCodeManagementPage inside the AdminRoute block.',
  '2. ' + FE + '/components/layout/nav-items.ts — add an item { label: Customer Codes, to: /admin/customer-codes, icon: a lucide icon not already used such as Boxes } to ADMIN_NAV_ITEMS and import the icon.',
  '3. ' + FE + '/types/admin/audit-log.ts — add customer_codes to the AuditCategory union.',
  '4. ' + FE + '/components/admin/audit-logs/AuditCategoryBadge.tsx — add a color mapping for customer_codes consistent with existing entries.',
  'Make ONLY these edits. Return the structured result with file set to frontend-wiring.',
]
await parallel([
  () => agent(beWire.join('\n'), { label: 'wire:backend', phase: 'Wire', schema: BUILD }),
  () => agent(feWire.join('\n'), { label: 'wire:frontend', phase: 'Wire', schema: BUILD }),
])

// ---------------------------------------------------------------- PHASE 4
phase('Verify')
const verifications = [
  { id: 'be-import-routes', ask:
    'Backend integration check. Run with Bash: cd into ' + ROOT + '/backend then ./.venv/bin/pip install -r requirements.txt (log to /tmp/cc_pip.log), then ./.venv/bin/python -c to import app.main and print the api_router routes whose path contains /admin/customer-codes. Verify 8 customer-codes routes exist; via TestClient confirm unauth GET /admin/customer-codes returns 401 (not 500). Also list any backend file under ' + BE + ' matching customer_code with more than 250 lines (wc -l). Report pass/fail with details.' },
  { id: 'be-excel-smoke', ask:
    'Backend Excel smoke test using ' + ROOT + '/backend/.venv python via Bash: (a) import app.services.customer_code.template and assert build_template_workbook() returns non-empty bytes that openpyxl can reopen showing the 10 canonical headers; (b) import app.utils.customer_code.excel and run parse_workbook on the bytes of the file at ' + ROOT + '/macro_files/west  central customer codes.xlsx and assert it returns at least 1 parsed row dict with keys segment/code/customer/destination and that numeric code/mob coerced to clean strings with no trailing .0. Report pass/fail with the parsed sample row.' },
  { id: 'fe-build', ask:
    'Frontend build check via Bash: cd into ' + ROOT + '/frontend then run npm run build and capture the tail. Report whether tsc+vite build is green. Then run npx eslint on the new customer-codes files (src/components/admin/customer-codes, src/api/admin/customer-codes, src/pages/admin/customer-codes, src/types/admin/customer-code*.ts) and report errors. List any new FE file over 250 lines (wc -l). Report pass/fail with exact errors if any.' },
  { id: 'contract-parity', ask:
    'Contract parity audit (read-only). Compare ' + BE + '/schemas/customer_code.py vs ' + FE + '/types/admin/customer-code.ts: confirm field names, sort-key whitelist, and list query keys (especially ship_to, ship_to_customer, region, field) match EXACTLY. Confirm ' + BE + '/routes/__init__.py includes the customer_code router, ' + BE + '/core/database.py registers CustomerCode, and the customer_codes audit category was added in model+schema+_CATEGORIES+events plus FE union+badge. Report any mismatch as a blocker.' },
  { id: 'design-deadcode', ask:
    'Design parity + dead-code audit (read-only). Confirm every new component under ' + FE + '/components/admin/customer-codes is imported/consumed (page, toolbar, table, dialogs, hooks) with no orphans. Confirm the page matches the Region/User page structure (header + toolbar + table + pagination + dialog stack). Check SegmentBadge uses quiet semantic tints and that comboboxes/inputs have aria-labels. Report parity issues or orphan files.' },
]
const verified = (await parallel(verifications.map((v) => () =>
  agent('You are a Phase-4 verifier for Customer Code Management. Repo root: ' + ROOT + '. ' + v.ask, { label: 'verify:' + v.id, phase: 'Verify', schema: VERIFY }),
))).filter(Boolean)

return { findings: findings.length, built: contracts.length + impl.length, verified }

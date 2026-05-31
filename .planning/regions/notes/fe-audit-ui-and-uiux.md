# Frontend Audit-Category UI Surfacing + Region Management UI/UX Design Spec

> Area: Part A — audit-log `regions` category surfacing. Part B — Region Management premium UI/UX spec.
> Audited files: `AuditCategoryBadge.tsx`, `AuditLogToolbar.tsx`, `hooks/useAuditLogs.ts`,
> `types/admin/audit-log.ts`, `types/admin/audit-log-ui.ts`, `src/index.css`,
> `pages/admin/users/index.tsx`, `pages/admin/audit-logs/index.tsx`.

---

## Part A — Audit category `regions` surfacing

### A1. Is the category filter list dynamic (backend facets) or hardcoded?

**HYBRID — static fallback list + live facets.** Evidence:

`AuditLogToolbar.tsx` lines 27–35:
```ts
const STATIC_CATEGORIES: AuditCategory[] = [
  "http", "auth", "admin", "data", "system", "cron", "security",
]
// ...
const categoryOptions = toOptions(facets?.categories ?? STATIC_CATEGORIES)
```

The toolbar uses `facets?.categories` (backend-driven, loaded once on mount via
`getAuditLogFacets()` in `useAuditLogs.ts`) and falls back to `STATIC_CATEGORIES`
when facets are null (loading / error). **Both the type union AND the static list
must include `"regions"`.** The backend `_CATEGORIES` list is the authoritative
source for the live facets path (SPEC §1.7 already covers that).

---

### A2. Exact edit — `src/types/admin/audit-log.ts`

File: `frontend/src/types/admin/audit-log.ts`

Current `AuditCategory` union (line ~20):
```ts
export type AuditCategory =
  | "http"
  | "auth"
  | "admin"
  | "data"
  | "system"
  | "cron"
  | "security"
```

Required change — append `"regions"`:
```ts
export type AuditCategory =
  | "http"
  | "auth"
  | "admin"
  | "data"
  | "system"
  | "cron"
  | "security"
  | "regions"
```

**No other type edits needed in this file.** `AuditLogFacets.categories` is typed
`AuditCategory[]` so it automatically accepts `"regions"` after the union change.

---

### A3. Exact edit — `src/components/admin/audit-logs/AuditCategoryBadge.tsx`

The badge uses a `const CATEGORY_MAP = { ... } as const satisfies Record<string, { label: string; className: string }>`.
The `category` prop is typed `AuditCategory` (from `AuditCategoryBadgeProps`).

**TypeScript will NOT error at runtime if an unknown key is passed because
`cfg = CATEGORY_MAP[category]` is `undefined` for missing keys — but the badge
will crash rendering `cfg.className` undefined.**

The `CATEGORY_MAP` must have `"regions"` as a key. Existing palette uses:
- slate (http), indigo (auth), violet (admin), teal (data), sky (system), amber (cron), red (security)

Chosen token for `regions`: **emerald** — distinct from all existing entries,
semantically fits "geographic/regional" groups, does not clash with the active
badge (which is also emerald solid). The badge is outline-style (subdued), so
the emerald outline won't be confused with the solid Active badge.

Append to `CATEGORY_MAP` inside `AuditCategoryBadge.tsx`:
```ts
  regions: {
    label: "Regions",
    className:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400",
  },
```

Full updated object (showing all keys for context; only `regions` is new):
```ts
const CATEGORY_MAP = {
  http:     { label: "HTTP",     className: "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-400" },
  auth:     { label: "Auth",     className: "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-400" },
  admin:    { label: "Admin",    className: "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-800 dark:bg-violet-950/50 dark:text-violet-400" },
  data:     { label: "Data",     className: "border-teal-200 bg-teal-50 text-teal-700 dark:border-teal-800 dark:bg-teal-950/50 dark:text-teal-400" },
  system:   { label: "System",   className: "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-800 dark:bg-sky-950/50 dark:text-sky-400" },
  cron:     { label: "Cron",     className: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-400" },
  security: { label: "Security", className: "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/50 dark:text-red-400" },
  regions:  { label: "Regions",  className: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400" },
} as const satisfies Record<string, { label: string; className: string }>
```

---

### A4. Exact edit — `AuditLogToolbar.tsx` static fallback list

File: `frontend/src/components/admin/audit-logs/AuditLogToolbar.tsx`

Current `STATIC_CATEGORIES` (line 27–35):
```ts
const STATIC_CATEGORIES: AuditCategory[] = [
  "http", "auth", "admin", "data", "system", "cron", "security",
]
```

Required change — append `"regions"`:
```ts
const STATIC_CATEGORIES: AuditCategory[] = [
  "http", "auth", "admin", "data", "system", "cron", "security", "regions",
]
```

**No change to `useAuditLogs.ts`** — it only forwards the facets response from
the backend; no hardcoded list there.

---

### A5. `AuditCategoryBadgeProps` constraint

`AuditCategoryBadgeProps.category` is typed `AuditCategory` (not `string`).
After the union edit in A2, the TypeScript compiler accepts `"regions"` in
`compact` mode and in `aria-label`. No prop-type change needed.

---

## Part B — Region Management premium UI/UX design spec

> All tokens reference CSS custom properties defined in `frontend/src/index.css`.
> No raw hex. No raw oklch values in component code. Dark-mode handled by
> `.dark {}` overrides in `index.css` — Tailwind v4 `@custom-variant dark`
> propagates automatically. Tailwind color utilities (emerald-*, slate-*, etc.)
> are used for non-semantic colors (badges); semantic tokens used for everything else.

---

### B1. Page header (match existing admin pages exactly)

Copy the exact JSX pattern from `pages/admin/users/index.tsx` and
`pages/admin/audit-logs/index.tsx`. Both use:

```tsx
<div className="flex items-start gap-3">
  <span
    aria-hidden
    className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
  >
    <MapPin className="size-4" />   {/* lucide-react */}
  </span>
  <div>
    <h2 className="text-xl font-semibold tracking-tight text-foreground">
      Region Management
    </h2>
    <p className="text-sm text-muted-foreground mt-0.5">
      Manage regional distribution groups and their notification recipients.
    </p>
  </div>
</div>
<Separator />
```

Tokens used: `bg-primary/10` (indigo-10%), `text-primary` (indigo), `text-foreground`,
`text-muted-foreground`. Icon chip size: `h-9 w-9`. All identical to User Management
and Audit Logs — no deviation allowed.

---

### B2. Layout spacing scale

Matches the `gap-5` flex column used by both existing admin pages:
```tsx
<div className="flex flex-col gap-5">
  {/* header */}
  {/* <Separator /> */}
  {/* toolbar */}
  {/* table */}
  {/* pagination */}
  {/* dialogs */}
</div>
```

Internal component gaps:
- Toolbar items: `gap-2` (same as `UserTableToolbar` / `AuditLogToolbar`)
- Table cell padding: match existing `UserTable` (infer from `TableCell` shadcn defaults, `px-4 py-2`)
- Dialog form fields: `gap-4` between labeled groups (match `CreateUserDialog`)
- Chip list in table/dialog: `flex flex-wrap gap-1`
- Dialog padding: `px-6 py-4` (shadcn `DialogContent` defaults)

---

### B3. `RegionActiveBadge` — active/inactive treatment

SPEC §2.7 is precise. Implement exactly:

```tsx
// Active
<Badge className="bg-emerald-600 text-white dark:bg-emerald-700 border-transparent">
  Active
</Badge>

// Inactive
<Badge variant="outline" className="text-muted-foreground">
  Inactive
</Badge>
```

Note: `variant="outline"` provides the base border; the `className` override on
the active badge sets a **solid** emerald fill (not outline). This distinguishes
it clearly from the `AuditCategoryBadge` for `"regions"` (which is outline/tinted).
The `bg-emerald-600 text-white` on light and `bg-emerald-700 text-white` on dark
both pass ≥4.5:1 contrast (emerald-600 on white is ~4.8:1; white on emerald-600
is identical).

`RegionActiveBadgeProps` signature (from `region-ui.ts`):
```ts
export interface RegionActiveBadgeProps { active: boolean }
```

---

### B4. Email chip treatment

Two contexts: table cell (read-only, truncated) and dialog (interactive chip input).

#### B4a. Table cell — read-only chips

```tsx
{emails.length === 0 ? (
  <span className="text-muted-foreground">—</span>
) : (
  <div className="flex flex-wrap gap-1">
    {emails.slice(0, 3).map((email) => (
      <span
        key={email}
        className="font-mono text-xs text-muted-foreground bg-muted rounded px-1.5 py-0.5 leading-tight"
      >
        {email}
      </span>
    ))}
    {emails.length > 3 && (
      <span className="text-xs text-muted-foreground px-1">
        +{emails.length - 3} more
      </span>
    )}
  </div>
)}
```

Tokens: `bg-muted`, `text-muted-foreground`, `font-mono`, `text-xs`. The muted
background provides subtle chip containment without introducing raw color. Dark
mode automatic via `--muted` / `--muted-foreground` CSS variables.

#### B4b. Dialog chip input (CreateRegionDialog / EditRegionDialog)

The input has two visual layers: the chip list above + the text input below.
Wrap both in a single bordered container that matches `--input` / `--border`:

```tsx
<div
  className="flex flex-wrap gap-1 rounded-md border border-input bg-background px-3 py-2 min-h-10 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-0"
  role="group"
  aria-label="Email recipients"
>
  {emails.map((email, i) => (
    <span
      key={email}
      className="inline-flex items-center gap-1 font-mono text-xs bg-muted text-muted-foreground rounded px-1.5 py-0.5"
    >
      {email}
      <button
        type="button"
        onClick={() => removeEmail(i)}
        aria-label={`Remove ${email}`}
        className="text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded-sm"
      >
        <X className="size-3" aria-hidden />
      </button>
    </span>
  ))}
  <input
    type="email"
    value={inputValue}
    onChange={(e) => setInputValue(e.target.value)}
    onKeyDown={handleKeyDown}   /* Enter / comma → addEmail(); Backspace on empty → removeLast() */
    placeholder={emails.length === 0 ? "Add email addresses…" : ""}
    className="flex-1 min-w-32 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
    aria-label="Email input — press Enter or comma to add"
  />
</div>
```

Tokens: `border-input`, `bg-background`, `ring-ring`, `bg-muted`, `text-muted-foreground`,
`text-foreground`, `placeholder:text-muted-foreground`. No raw hex.

Keyboard behavior (required for accessibility):
- `Enter` or `,` → validate email via `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` → add chip; clear input
- `Backspace` on empty input → remove last chip
- `X` button on each chip → remove that chip (mouse + keyboard via `focus-visible`)
- Tab moves focus to next field (not to individual chips in the list — chips are
  removed via Backspace or X buttons)

Validation error state — show below the container:
```tsx
{emailError && (
  <p className="text-xs text-destructive mt-1" role="alert">
    {emailError}
  </p>
)}
```
Token: `text-destructive` (JSW red, `--destructive`).

---

### B5. Loading, empty, and error states

#### Loading (table body)
8-skeleton rows. Each row mirrors the actual column structure. Use shadcn
`Skeleton` component with `bg-muted animate-pulse`:

```tsx
{Array.from({ length: 8 }).map((_, i) => (
  <TableRow key={i}>
    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
    <TableCell><Skeleton className="h-4 w-48" /></TableCell>
    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
    <TableCell><Skeleton className="h-4 w-8" /></TableCell>
  </TableRow>
))}
```

Token: `bg-muted` (via `Skeleton`'s base class — do not override it).

#### Empty state (no rows after load)
Centered in the table body, spanning all columns:
```tsx
<TableRow>
  <TableCell colSpan={5} className="py-16 text-center">
    <div className="flex flex-col items-center gap-2 text-muted-foreground">
      <MapPin className="size-8 opacity-40" aria-hidden />
      <p className="text-sm font-medium">No regions found</p>
      <p className="text-xs">Create a region to get started.</p>
    </div>
  </TableCell>
</TableRow>
```

Token: `text-muted-foreground`. Icon: `MapPin` (lucide-react, consistent with page header).

#### Error state (fetch failed)
Above the table (or in the table area), visible API error banner:
```tsx
<div
  role="alert"
  className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
>
  <AlertCircle className="size-4 shrink-0" aria-hidden />
  {error}
</div>
```

Tokens: `border-destructive/30`, `bg-destructive/10`, `text-destructive`.
Dark mode: `--destructive` shifts to `oklch(0.62 0.24 27)` automatically.

#### Loading spinner in submit buttons (dialog)
```tsx
<Button disabled={submitting}>
  {submitting && <Loader2 className="size-4 animate-spin mr-2" aria-hidden />}
  {submitting ? "Saving…" : "Create region"}
</Button>
```
All form inputs must have `disabled={submitting}` when a mutation is in-flight.

---

### B6. Dark-mode behavior

The app uses `next-themes` `ThemeProvider`. All tokens in `index.css` have `:root`
(light) and `.dark` (dark) definitions. Rules for components:

- **Use only semantic tokens** (`bg-background`, `bg-card`, `text-foreground`,
  `text-muted-foreground`, `border-border`, `border-input`, `ring-ring`,
  `bg-muted`, `bg-primary/10`, `text-primary`, `text-destructive`)
  for structural elements — these auto-invert.
- **Tailwind color utilities** (emerald, slate, etc.) require explicit dark
  variants. Pattern from `AuditCategoryBadge.tsx`:
  `"border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400"`
  — use this exact triplet format for every badge color utility.
- **Active badge dark variant**: `bg-emerald-600 text-white dark:bg-emerald-700`
  (lighter emerald on dark backgrounds, still passes contrast).
- The sidebar uses `--sidebar` (deep navy in both modes). Navigation item for
  Regions uses `text-sidebar-foreground` active state `text-sidebar-primary`
  (gold accent) — handled by the existing nav layout, no custom work needed.

---

### B7. Focus / hover states

The project sets `@layer base { * { @apply border-border outline-ring/50; } }`.
`--ring` is `oklch(0.40 0.17 264)` light / `oklch(0.65 0.18 264)` dark (indigo).

Rules:
- Interactive elements (buttons, comboboxes, inputs): rely on shadcn defaults
  (`focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`).
  Do not override ring unless explicitly required.
- Table row hover: `hover:bg-muted/50` (matches UserTable pattern).
- `RowActionsMenu` trigger: `hover:bg-accent hover:text-accent-foreground`
  (shadcn DropdownMenuTrigger defaults — do not override).
- Email chip X button focus: `focus-visible:ring-1 focus-visible:ring-ring`
  (smaller ring; chip is compact).
- Dialog form inputs: shadcn `Input` default ring behavior — keep as-is.

---

### B8. Accessibility (contrast ≥4.5:1, keyboard nav, aria)

**Contrast — verified tokens:**
- `text-foreground` on `bg-background` light: `oklch(0.16)` on `oklch(0.98)` → ~13:1.
- `text-muted-foreground` on `bg-background` light: `oklch(0.48)` on `oklch(0.98)` → ~5.2:1 (passes AA).
- `text-muted-foreground` on `bg-muted` (chip): `oklch(0.48)` on `oklch(0.95)` → ~4.7:1 (passes AA).
- `bg-emerald-600 text-white` (Active badge): white on emerald-600 → ~4.8:1 (passes AA).
- `text-destructive` on `bg-background` light: `oklch(0.56, 0.24, 27)` on `oklch(0.98)` → ~5.6:1 (passes AA).
- Dark mode counterparts: all pass due to lighter foregrounds on darker backgrounds.

**CAUTION:** `text-xs` text (12px) requires 4.5:1 AA-large minimum. Email chips
at `font-mono text-xs text-muted-foreground` on `bg-muted`: ~4.7:1 (marginal, passes).
Do NOT reduce opacity further on chip text.

**Required aria attributes:**
- `<div role="toolbar" aria-label="Region table filters">` on the toolbar (matches AuditLogToolbar pattern).
- `<AuditCategoryBadge>` already adds `aria-label={`Audit category: ${cfg.label}`}` — the `regions` entry inherits this automatically once added to `CATEGORY_MAP`.
- Email chip group: `role="group" aria-label="Email recipients"` on the chip-input container.
- Each chip remove button: `aria-label={`Remove ${email}`}`.
- Submit button in loading state: add `aria-busy="true"` when `submitting`.
- Empty table state: no special aria needed (visual only, sighted flow).
- Error banner: `role="alert"` (triggers screen-reader announcement on mount).
- ConfirmActionDialog destructive variant: `aria-describedby` pointing to the
  warning copy; destructive Button should have `aria-label="Confirm delete"`.
- `ViewRegionSheet`: `aria-label="Region details"` on the `SheetContent`.

**Keyboard navigation:**
- Toolbar: Tab moves through AsyncCombobox → FilterCombobox → "Create region" button.
- Table: sortable column headers are `<button>` elements (not `<th>` with click).
- RowActionsMenu: standard `DropdownMenu` keyboard (Enter/Space open, Arrow keys
  navigate, Escape close) — no custom handling needed.
- Email chip input: documented in B4b above.
- All dialogs: shadcn `Dialog` and `Sheet` trap focus automatically via Radix UI.

---

### B9. `RegionTableToolbar` prop shape (from SPEC §2.2 + UserTableToolbar pattern)

```ts
interface RegionTableToolbarProps {
  query: RegionListQuery
  onQueryChange: (patch: Partial<RegionListQuery>) => void
  onCreate: () => void
}
```

`AsyncCombobox` uses `searchRegionOptions` (from `src/api/admin/regions/options.ts`).
Active filter uses `FilterCombobox` with:
```ts
const ACTIVE_OPTIONS: FilterComboboxOption[] = [
  { value: "true",  label: "Active"   },
  { value: "false", label: "Inactive" },
]
```
`allLabel="All statuses"`. Converting combobox string back to boolean:
```ts
onChange={(v) => onQueryChange({ active: v === null ? undefined : v === "true" })}
```

---

### B10. File length guard

Every new file must stay ≤250 lines. Known split points:
- `useRegionManagement.ts`: if mutations push past 250 lines, split as
  `hooks/useRegionMutations.ts` (SPEC §2.4 explicitly names this).
- `RegionTable.tsx`: if `SortableHead` + skeleton rows + empty + error + table
  approach 250 lines, extract `SortableHead` to a local `components/` sibling.
- `CreateRegionDialog.tsx` / `EditRegionDialog.tsx`: the chip input logic
  (state + handlers) can be extracted to `hooks/useEmailChipInput.ts` to keep
  dialog files lean.

---

## Summary of all exact edits required

| File | Change |
|---|---|
| `src/types/admin/audit-log.ts` | Add `\| "regions"` to `AuditCategory` union |
| `src/components/admin/audit-logs/AuditCategoryBadge.tsx` | Add `regions` entry to `CATEGORY_MAP` (emerald triplet) |
| `src/components/admin/audit-logs/AuditLogToolbar.tsx` | Add `"regions"` to `STATIC_CATEGORIES` fallback array |
| `src/components/admin/audit-logs/hooks/useAuditLogs.ts` | **No change** — no hardcoded list |
